import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { isAppTokenConfigured, PUBLIC_APP_TOKEN } from '@/lib/public-env';

let warnedMissingAppToken = false;

// Configuração base da API
const LOCAL_API_DEFAULT = 'http://localhost:8005/api/v1';
/** Origem HTTPS da API em produção (sem `/api/v1`). */
export const PROD_API_PUBLIC_ORIGIN = 'https://api-gplace.gooding.solutions';
/** Fallback quando não há env válida (evitar apontar localhost no site público). */
const PROD_API_FALLBACK = `${PROD_API_PUBLIC_ORIGIN}/api/v1`;

const envUrlPointsToLoopback = (url: string) =>
  /localhost|127\.0\.0\.1/.test(url);

const pageHostnameIsLocal = () => {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || /^192\.168\./.test(h);
};

const getApiBaseUrl = () => {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();

  // Em site público, ignorar NEXT_PUBLIC_API_URL se ainda apontar para loopback (build com .env local).
  const envIsUnsafeOnPublicSite =
    !!fromEnv &&
    typeof window !== 'undefined' &&
    !pageHostnameIsLocal() &&
    envUrlPointsToLoopback(fromEnv);

  const shouldUseEnv = Boolean(fromEnv) && !envIsUnsafeOnPublicSite;

  if (shouldUseEnv && fromEnv) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🌐 API URL (env):', fromEnv);
    }
    return fromEnv;
  }

  const isDevelopment = process.env.NODE_ENV === 'development';
  const isLocalhost = typeof window !== 'undefined' && pageHostnameIsLocal();

  if (isDevelopment || isLocalhost) {
    if (isDevelopment) {
      console.log('🏠 Usando API LOCAL (dev)');
    }
    return LOCAL_API_DEFAULT;
  }

  return PROD_API_FALLBACK;
};

const API_BASE_URL = getApiBaseUrl();

// Interface para resposta padrão da API
export interface ApiResponse<T = any> {
  message: string;
  data: T;
}

export interface HeaderNotificationItem {
  key: string;
  type: 'profile' | 'birthday_self' | 'birthday_peer';
  title: string;
  message: string;
  /** Presente em notificações de aniversário — nome ao lado do bolo */
  celebrant_name?: string | null;
  action_url: string | null;
  created_at: string;
  /** Se false, não mostrar "marcar como lida" (ex.: falta data de nascimento até corrigir cadastro) */
  dismissible?: boolean;
}

// Interface para erro da API (pode incluir response original para o consumidor usar status/data)
export interface ApiError {
  message: string;
  data?: any;
  status?: number;
  response?: { status: number; data?: unknown };
}

// Interface para usuário
export interface UserRole {
  id: number;
  name: string;
  description?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  person_id?: number;
  establishment_id?: number;
  role?: string;
  roles?: UserRole[];
  /** Nomes Spatie (`customers_view`, …) — perfil/login api-gplace. */
  permissions?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  person?: Person;
  establishment?: Establishment;
}

// Interface para pessoa
export interface Person {
  id: number;
  nif?: string;
  name?: string;
  full_name?: string;
  birthdate?: string;
  email?: string;
  phone?: string;
  city_id?: number;
  zip_code?: string;
  address?: string;
  district?: string;
  number?: string;
  gender?: string;
  description?: string;
  city?: {
    id: number;
    name: string;
    state: {
      id: number;
      name: string;
      uf: string;
    };
  };
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  person_id: number;
  whatsapp?: string;
  created_at: string;
  updated_at: string;
  person: Person;
}

// Interface para produto
export interface Product {
  id: number;
  name: string;
  description?: string;
  sku?: string;
  price?: number;
  stock_quantity?: number;
  minimum_stock?: number;
  category_id?: number;
  establishment_id?: number;
  is_active?: boolean;
  category?: Category;
  establishment?: Establishment;
  created_at: string;
  updated_at: string;
}

// Interface para escola
export interface School {
  id: number;
  person_id: number;
  client_id: number;
  status: number;
  created_at: string;
  updated_at: string;
}

// Interface para estado
export interface State {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

// Interface para cidade
export interface City {
  id: number;
  title: string;
  state_id: number;
  letter: string; // Código do estado (ex: "TO", "SP", "RJ")
  lat: string;
  long: string;
  created_at: string;
  updated_at: string;
}

// Interface para login
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

// Interface para registro de usuário
export interface RegisterRequest {
  name: string;
  email?: string;
  password: string;
  phone: string;
  number_inscription?: string;
}

// Interface para criação de usuário
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  establishment_id?: number;
  role: string;
  is_active?: boolean;
  // Campos opcionais de Person (dados pessoais)
  birthdate?: string | null;      // Formato: YYYY-MM-DD
  nif?: string | null;            // CPF/CNPJ
  phone?: string | null;
  city_id?: number | null;
  zip_code?: string | null;
  address?: string | null;
  district?: string | null;
  number?: string | null;
  gender?: 'M' | 'F' | 'O' | null;
}

// Classe principal da API
class ApiService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // 30 segundos de timeout
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Carregar token do localStorage
    this.token = this.getToken();

    // Interceptor: token Passport + header `app` (middleware CheckAppHeader na API Laravel)
    this.api.interceptors.request.use(
      (config) => {
        const appToken = PUBLIC_APP_TOKEN;
        if (appToken) {
          config.headers.set('app', appToken);
        } else if (typeof window !== 'undefined' && !warnedMissingAppToken) {
          warnedMissingAppToken = true;
          const msg =
            '[Gplace] NEXT_PUBLIC_APP_TOKEN ausente no build. A API responde 403 (middleware `app`). ' +
            'No Vercel: Environment Variables → NEXT_PUBLIC_APP_TOKEN = valor de `stores.app_token` (php artisan store:issue-app-token --show). ' +
            'Depois: Redeploy.';
          if (process.env.NODE_ENV === 'development') {
            console.warn(msg);
          } else {
            console.error(msg);
          }
        }

        // Sempre buscar o token mais recente do localStorage
        const currentToken = typeof window !== 'undefined' 
          ? localStorage.getItem('auth_token') 
          : this.token;
        
        if (currentToken) {
          config.headers.Authorization = `Bearer ${currentToken}`;
          // Atualizar token na memória também
          this.token = currentToken;
        }
        if (config.data instanceof FormData) {
          config.headers.delete('Content-Type');
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Interceptor para tratamento de respostas
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        // Tratar caso onde a resposta pode vir com HTML misturado (avisos PHP)
        if (typeof response.data === 'string' && response.data.includes('{')) {
          try {
            // Tentar encontrar o JSON na string (procurar por { ou [)
            const jsonMatch = response.data.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              response.data = JSON.parse(jsonMatch[0]);
            }
          } catch (parseError) {
            console.error('Erro ao fazer parse da resposta com HTML misturado:', parseError);
          }
        }
        return response;
      },
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expirado ou inválido — limpa storage e notifica AuthProvider (evita estado React
          // "logado" com token apagado + reload agressivo que mascarava o problema).
          this.clearToken();
        }
        return Promise.reject(error);
      }
    );

    // Carregar token do localStorage se existir
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  // Métodos de autenticação
  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      window.dispatchEvent(new CustomEvent('auth:session-invalid'));
    }
  }

  getToken(): string | null {
    // Se não há token na memória, tentar carregar do localStorage
    if (!this.token && typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        this.token = storedToken;
      }
    }
    return this.token;
  }

  // Métodos de autenticação
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await this.api.post('/auth/login', credentials);
      
      // Tratar caso onde a resposta pode vir com HTML misturado (avisos PHP)
      let responseData = response.data;
      
      // Se a resposta vier como string (com HTML misturado), tentar extrair o JSON
      if (typeof responseData === 'string') {
        try {
          // Tentar encontrar o JSON na string (procurar por { ou [)
          const jsonMatch = responseData.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            responseData = JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          console.error('Erro ao fazer parse da resposta:', parseError);
        }
      }
      
      // Verificar diferentes formatos de resposta
      let token: string | null = null;
      
      // Formato esperado: { data: { token: "...", user: {...} } }
      if (responseData?.data?.token) {
        token = responseData.data.token;
      }
      // Formato alternativo: { token: "...", user: {...} }
      else if (responseData?.token) {
        token = responseData.token;
      }
      // Formato alternativo: resposta direta com token
      else if (responseData?.data && typeof responseData.data === 'object' && 'token' in responseData.data) {
        token = (responseData.data as any).token;
      }
      
      if (token) {
        // Salvar token de forma síncrona
        this.setToken(token);
      } else {
        console.error('⚠️ Token não encontrado na resposta do login:', responseData);
      }
      
      return responseData;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async register(userData: RegisterRequest): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/auth/users', userData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.api.delete('/auth/logout');
    } catch (error) {
      // Ignorar erros de logout
    } finally {
      this.clearToken();
    }
  }

  async getProfile(): Promise<ApiResponse<User>> {
    try {
      const response = await this.api.get('/auth/profile');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const response = await this.api.put('/auth/profile', userData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Método para alteração de senha
  async changePassword(passwordData: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }): Promise<ApiResponse> {
    try {
      const response = await this.api.put('/auth/profile/password', passwordData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Métodos para produtos
  async getProducts(params?: {
    school_id?: number;
    client_id?: number;
    family_agriculture?: number;
    category_id?: number;
    establishment_id?: number;
    page?: number;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/products', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Método específico para vendedores - produtos disponíveis
  async getProductsAvailable(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/products/available');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Método específico para vendedores - categorias ativas
  async getCategoriesActive(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/categories/active');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Método para obter perfil do usuário logado
  async getUserProfile(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/auth/profile');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Método para obter produtos de uma categoria específica do estabelecimento
  async getProductsByCategoryAndEstablishment(categoryId: number, establishmentId: number): Promise<ApiResponse<any>> {
    try {
      // Usar endpoint correto: /products/category/{id}?establishment_id={id}
      const response = await this.api.get(`/products/category/${categoryId}?establishment_id=${establishmentId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getProduct(id: number): Promise<ApiResponse<Product>> {
    try {
      const response = await this.api.get(`/products/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createProduct(productData: Partial<Product>): Promise<ApiResponse<Product>> {
    try {
      const response = await this.api.post('/products', productData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateProduct(id: number, productData: Partial<Product>): Promise<ApiResponse<Product>> {
    try {
      const response = await this.api.put(`/products/${id}`, productData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteProduct(id: number): Promise<ApiResponse> {
    try {
      const response = await this.api.delete(`/products/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Métodos para escolas
  async getSchools(params?: {
    name?: string;
    client_id?: number;
    page?: number;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/schools', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getSchool(id: number): Promise<ApiResponse<School>> {
    try {
      const response = await this.api.get(`/schools/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createSchool(schoolData: Partial<School>): Promise<ApiResponse<School>> {
    try {
      const response = await this.api.post('/schools', schoolData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateSchool(id: number, schoolData: Partial<School>): Promise<ApiResponse<School>> {
    try {
      const response = await this.api.put(`/schools/${id}`, schoolData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteSchool(id: number): Promise<ApiResponse> {
    try {
      const response = await this.api.delete(`/schools/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Métodos para estados e cidades
  async getStates(): Promise<ApiResponse<State[]>> {
    try {
      const response = await this.api.get('/states');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCities(params?: { state?: number; search?: string; page?: number }): Promise<ApiResponse<City[]>> {
    try {
      const response = await this.api.get('/cities', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCity(id: number): Promise<ApiResponse<City>> {
    try {
      const response = await this.api.get(`/cities/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /** Marcas da loja (header `app`). */
  async getBrands(): Promise<ApiResponse<Array<{ id: number; name: string; image?: string; image_url?: string }>>> {
    const response = await this.api.get('/brands');
    return response.data;
  }

  /** Secções em árvore (API pública; para admin de produto preferir getAdminProductFormMeta). */
  async getSectionsTree(): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/sections');
    return response.data;
  }

  async getPaymentMethods(): Promise<ApiResponse<Array<{ id: number; name?: string }>>> {
    const response = await this.api.get('/payment-methods');
    return response.data;
  }

  async getAdminProductFormMeta(): Promise<
    ApiResponse<{
      sections: Array<{ id: number; name: string; parent_id?: number | null }>;
      measurement_units: Array<{ id: number; name: string; initials?: string }>;
      families: Array<{ id: number; name: string }>;
      presentations: Array<{ id: number; name: string }>;
    }>
  > {
    const response = await this.api.get('/admin/product-form-meta');
    return response.data;
  }

  async getAdminStoreRole(id: number): Promise<
    ApiResponse<{ role: Record<string, unknown>; permission_ids: number[] }>
  > {
    const response = await this.api.get(`/admin/store-roles/${id}`);
    return response.data;
  }

  async syncAdminStoreRolePermissions(id: number, permissionIds: number[]): Promise<ApiResponse<unknown>> {
    const response = await this.api.put(`/admin/store-roles/${id}/permissions`, { permission_ids: permissionIds });
    return response.data;
  }

  // Método para buscar pessoa por NIF
  async getPersonByNif(nif: string): Promise<ApiResponse<Person>> {
    try {
      const response = await this.api.get('/get-person-by-nif', { 
        params: { nif } 
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ===== MÉTODOS DO SISTEMA TIM =====

  // Métodos para estabelecimentos
  async getEstablishments(params?: {
    search?: string;
    is_active?: boolean;
    page?: number;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/establishments', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getEstablishment(id: number): Promise<ApiResponse<Establishment>> {
    try {
      const response = await this.api.get(`/establishments/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createEstablishment(data: Partial<Establishment>): Promise<ApiResponse<Establishment>> {
    try {
      const response = await this.api.post('/establishments', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateEstablishment(id: number, data: Partial<Establishment>): Promise<ApiResponse<Establishment>> {
    try {
      const response = await this.api.put(`/establishments/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteEstablishment(id: number): Promise<ApiResponse> {
    try {
      const response = await this.api.delete(`/establishments/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getEstablishmentUsers(id: number, params?: {
    page?: number;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get(`/users/establishment/${id}`, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getEstablishmentSales(id: number, params?: {
    status?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get(`/establishments/${id}/sales`, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Relatório por estabelecimento (loja).
   * Retorna dados do(s) estabelecimento(s) com vendedores e vendas no período.
   * - Vendedor/Gerente: só o próprio estabelecimento (establishment_id ignorado).
   * - Gestor/Master: um estabelecimento (establishment_id) ou todos (omitir).
   */
  async getEstablishmentsReport(params?: {
    date_from?: string;
    date_to?: string;
    establishment_id?: number;
  }): Promise<ApiResponse<EstablishmentReportItem[]>> {
    try {
      const response = await this.api.get('/establishments/report', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Métodos para categorias
  async getCategories(params?: {
    search?: string;
    is_active?: boolean;
    page?: number;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/categories', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getActiveCategories(): Promise<ApiResponse<Category[]>> {
    try {
      const response = await this.api.get('/categories/active');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCategory(id: number): Promise<ApiResponse<Category>> {
    try {
      const response = await this.api.get(`/categories/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createCategory(data: Partial<Category>): Promise<ApiResponse<Category>> {
    try {
      const response = await this.api.post('/categories', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateCategory(id: number, data: Partial<Category>): Promise<ApiResponse<Category>> {
    try {
      const response = await this.api.put(`/categories/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteCategory(id: number): Promise<ApiResponse> {
    try {
      const response = await this.api.delete(`/categories/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCategoryProducts(id: number, params?: {
    page?: number;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get(`/categories/${id}/products`, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Métodos para clientes
  async getCustomers(params?: {
    search?: string;
    city?: string;
    state?: string;
    page?: number;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/customers', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCustomer(id: number): Promise<ApiResponse<Customer>> {
    try {
      const response = await this.api.get(`/customers/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createCustomer(data: Partial<Customer>): Promise<ApiResponse<Customer>> {
    try {
      const response = await this.api.post('/customers', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateCustomer(id: number, data: Partial<Customer>): Promise<ApiResponse<Customer>> {
    try {
      const response = await this.api.put(`/customers/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteCustomer(id: number): Promise<ApiResponse> {
    try {
      const response = await this.api.delete(`/customers/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async searchCustomerByNif(nif: string): Promise<ApiResponse<Customer>> {
    try {
      const response = await this.api.post('/customers/search-by-nif', { nif });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Métodos para vendas
  async getSales(params?: {
    status?: string;
    establishment_id?: number;
    seller_id?: number;
    category_id?: number;
    customer_id?: number;
    date_from?: string;
    date_to?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/sales', { params });
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getMySales(params?: {
    page?: number;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/sales/my-sales', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getSale(id: number): Promise<ApiResponse<Sale>> {
    try {
      const response = await this.api.get(`/sales/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createSale(data: Partial<Sale>): Promise<ApiResponse<Sale>> {
    try {
      const response = await this.api.post('/sales', data);
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Cria venda com anexos (multipart/form-data).
   * Exige pelo menos um documento. Campos da venda + document(s) no FormData.
   * Não envia Content-Type para o browser definir multipart/form-data com boundary.
   */
  async createSaleWithDocuments(formData: FormData): Promise<ApiResponse<Sale>> {
    try {
      const response = await this.api.post('/sales', formData, {
        headers: { 'Content-Type': undefined } as any,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateSale(id: number, data: Partial<Sale>): Promise<ApiResponse<Sale>> {
    try {
      const response = await this.api.put(`/sales/${id}`, data);
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteSale(id: number): Promise<ApiResponse> {
    try {
      const response = await this.api.delete(`/sales/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }


  // Método para tratamento de erros
  // ===== CLIENTES (PESSOAS) =====
  async getClients(params?: {
    page?: number;
    search?: string;
    city?: string;
    state?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/customers', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getClient(id: number): Promise<ApiResponse<Person>> {
    try {
      const response = await this.api.get(`/customers/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }


  async createClient(data: Partial<Person>): Promise<ApiResponse<Person>> {
    try {
      const response = await this.api.post('/customers', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateClient(id: number, data: Partial<Person>): Promise<ApiResponse<Person>> {
    try {
      const response = await this.api.put(`/customers/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteClient(id: number): Promise<ApiResponse> {
    try {
      const response = await this.api.delete(`/customers/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async searchClientByNif(nif: string): Promise<ApiResponse<Person>> {
    try {
      const response = await this.api.post('/customers/search-by-nif', { nif });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ===== USUÁRIOS DO SISTEMA =====
  async getUsers(params?: {
    page?: number;
    search?: string;
    establishment_id?: number;
    role?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/users', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUser(id: number): Promise<ApiResponse<User>> {
    try {
      const response = await this.api.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createUser(data: CreateUserRequest): Promise<ApiResponse<User>> {
    try {
      const response = await this.api.post('/users', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateUser(id: number, data: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const response = await this.api.put(`/users/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteUser(id: number): Promise<ApiResponse> {
    try {
      const response = await this.api.delete(`/users/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Métodos específicos para status de usuários
  async activateUser(id: number): Promise<ApiResponse<User>> {
    try {
      const response = await this.api.post(`/users/${id}/activate`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deactivateUser(id: number): Promise<ApiResponse<User>> {
    try {
      const response = await this.api.post(`/users/${id}/deactivate`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async toggleUserStatus(id: number): Promise<ApiResponse<User>> {
    try {
      const response = await this.api.post(`/users/${id}/toggle-status`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ===== ROLES E PERMISSÕES =====

  // Métodos para roles
  async getRoles(params?: {
    page?: number;
    search?: string;
    status?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/roles', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getRole(id: number): Promise<ApiResponse<Role>> {
    try {
      const response = await this.api.get(`/roles/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createRole(data: Partial<Role>): Promise<ApiResponse<Role>> {
    try {
      const response = await this.api.post('/roles', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateRole(id: number, data: Partial<Role>): Promise<ApiResponse<Role>> {
    try {
      const response = await this.api.put(`/roles/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteRole(id: number): Promise<ApiResponse> {
    try {
      const response = await this.api.delete(`/roles/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Métodos para gerenciamento de usuários em roles
  async getRoleUsers(roleId: number): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get(`/roles/${roleId}/users`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async assignRoleToUser(userId: number, roleId: number): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post(`/users/${userId}/roles`, { role_id: roleId });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async removeRoleFromUser(userId: number, roleId: number): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.delete(`/users/${userId}/roles/${roleId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUserRoles(userId: number): Promise<ApiResponse<Role[]>> {
    try {
      const response = await this.api.get(`/users/${userId}/roles`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUserPermissions(userId: number): Promise<ApiResponse<Permission[]>> {
    try {
      const response = await this.api.get(`/users/${userId}/permissions`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Métodos para permissões
  async getPermissions(params?: {
    page?: number;
    search?: string;
    module?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/permissions', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPermission(id: number): Promise<ApiResponse<Permission>> {
    try {
      const response = await this.api.get(`/permissions/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createPermission(data: Partial<Permission>): Promise<ApiResponse<Permission>> {
    try {
      const response = await this.api.post('/permissions', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updatePermission(id: number, data: Partial<Permission>): Promise<ApiResponse<Permission>> {
    try {
      const response = await this.api.put(`/permissions/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deletePermission(id: number): Promise<ApiResponse> {
    try {
      const response = await this.api.delete(`/permissions/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Métodos para gerenciar permissões de roles
  async assignPermissionsToRole(roleId: number, permissionIds: string[]): Promise<ApiResponse<Role>> {
    try {
      const response = await this.api.post(`/roles/${roleId}/permissions`, {
        permission_ids: permissionIds
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async removePermissionsFromRole(roleId: number, permissionIds: number[]): Promise<ApiResponse<Role>> {
    try {
      const response = await this.api.delete(`/roles/${roleId}/permissions`, {
        data: { permission_ids: permissionIds }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getRolePermissions(roleId: number): Promise<ApiResponse<Permission[]>> {
    try {
      const response = await this.api.get(`/roles/${roleId}/permissions`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // === CATEGORIAS DINÂMICAS ===
  async getFieldConfig(categoryId: number): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get(`/categories/${categoryId}/field-config`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): ApiError {
    if (error.response != null) {
      const data = error.response.data;
      const message = (typeof data === 'object' && data?.message) ? data.message : (error.response.data?.message || 'Erro na requisição');
      return {
        message,
        data: (typeof data === 'object' && data?.data !== undefined) ? data.data : data,
        status: error.response.status,
        response: { status: error.response.status, data: error.response.data },
      };
    }
    return {
      message: error?.message || 'Erro desconhecido',
      status: 0,
    };
  }

  // Buscar produtos por categoria e termo
  async searchProducts(category: string, searchTerm: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/products/search', {
        params: {
          category,
          search: searchTerm
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // === NOVOS ENDPOINTS PARA VENDEDORES ===
  
  // Buscar estabelecimento do vendedor
  async getMyEstablishment() {
    try {
      const response = await this.api.get('/my-establishment');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Upload de documento para venda (agora funciona para vendedores)
  async uploadSaleDocument(saleId: number, file: File, documentType: string, description: string = '') {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', documentType);
      formData.append('description', description);

      const response = await this.api.post(`/sales/${saleId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Buscar documentos de uma venda
  async getSaleDocuments(saleId: number): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get(`/sales/${saleId}/documents`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Download de documento
  async downloadDocument(saleId: number, documentId: number): Promise<Blob> {
    try {
      const response = await this.api.get(`/sales/${saleId}/documents/${documentId}/download`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Excluir documento
  async deleteDocument(saleId: number, documentId: number): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.delete(`/sales/${saleId}/documents/${documentId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Método para buscar dados de faturamento do dashboard
  async getDashboardFaturamento(params: {
    date_from: string;
    date_to: string;
    establishment_id?: number;
    seller_id?: number;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/dashboard/faturamento', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Método para buscar estatísticas gerais do dashboard
  async getDashboardStats(params?: {
    establishment_id?: number;
    seller_id?: number;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/dashboard/stats', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Extrai { items, unread_count } do envelope Laravel { message, data } ou de respostas já “achatadas”.
   */
  private unwrapNotificationInbox(axiosBody: unknown): {
    items: HeaderNotificationItem[];
    unread_count: number;
  } {
    const empty = { items: [] as HeaderNotificationItem[], unread_count: 0 };
    if (axiosBody == null || typeof axiosBody !== 'object') {
      return empty;
    }
    const root = axiosBody as Record<string, unknown>;
    const inner =
      root.data !== undefined && typeof root.data === 'object' && root.data !== null
        ? (root.data as Record<string, unknown>)
        : root;
    const items = Array.isArray(inner.items) ? (inner.items as HeaderNotificationItem[]) : [];
    const unread =
      typeof inner.unread_count === 'number' ? inner.unread_count : items.length;
    return { items, unread_count: unread };
  }

  async getNotificationsInbox(): Promise<{
    items: HeaderNotificationItem[];
    unread_count: number;
  }> {
    try {
      const response = await this.api.get('/notifications/inbox');
      return this.unwrapNotificationInbox(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async dismissNotification(key: string): Promise<ApiResponse<null>> {
    try {
      const response = await this.api.post('/notifications/dismiss', { key });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async dismissAllNotifications(): Promise<ApiResponse<null>> {
    try {
      const response = await this.api.post('/notifications/dismiss-all');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /** Admin / loja (migração Blade → Next), escopo pelo header `app` (loja). */
  async getAdminStoreSettings(): Promise<ApiResponse<{
    settings: Record<string, unknown> | null;
    social_media_options: unknown[];
    erp_options: unknown[];
  }>> {
    const response = await this.api.get('/admin/store-settings');
    return response.data;
  }

  async updateAdminStoreSettings(payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.put('/admin/store-settings', payload);
    return response.data;
  }

  async getAdminParameters(params?: { page?: number; per_page?: number }): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/parameters', { params });
    return response.data;
  }

  async getAdminStoreUsers(params?: { page?: number; per_page?: number; search?: string }): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/store-users', { params });
    return response.data;
  }

  async getAdminStoreRoles(params?: { page?: number; per_page?: number; search?: string }): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/store-roles', { params });
    return response.data;
  }

  async getAdminPermissions(params?: { page?: number; per_page?: number }): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/permissions', { params });
    return response.data;
  }

  async getAdminStoreFaqs(params?: { page?: number; per_page?: number }): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/store-faqs', { params });
    return response.data;
  }

  async getAdminStoreCatalogs(params?: { page?: number; per_page?: number }): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/store-catalogs', { params });
    return response.data;
  }

  async getAdminTokens(params?: { page?: number; per_page?: number }): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/tokens', { params });
    return response.data;
  }

  async getAdminTenants(params?: { page?: number; per_page?: number; search?: string }): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/tenants', { params });
    return response.data;
  }

  async getAdminCustomers(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/customers', { params });
    return response.data;
  }

  async getAdminLeads(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/leads', { params });
    return response.data;
  }

  async getAdminStores(params?: { page?: number; per_page?: number; search?: string }): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/stores', { params });
    return response.data;
  }

  async getAdminSalesmen(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/salesmen', { params });
    return response.data;
  }

  async getAdminProducts(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    is_enabled?: boolean;
    section_id?: number;
    brand_id?: number;
    type?: string;
    sku?: string;
  }): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/products', { params });
    return response.data;
  }

  async getAdminParameter(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.get(`/admin/parameters/${id}`);
    return response.data;
  }

  async createAdminParameter(payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.post('/admin/parameters', payload);
    return response.data;
  }

  async updateAdminParameter(id: number, payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.put(`/admin/parameters/${id}`, payload);
    return response.data;
  }

  async deleteAdminParameter(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.delete(`/admin/parameters/${id}`);
    return response.data;
  }

  async getAdminStoreFaq(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.get(`/admin/store-faqs/${id}`);
    return response.data;
  }

  async createAdminStoreFaq(payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.post('/admin/store-faqs', payload);
    return response.data;
  }

  async updateAdminStoreFaq(id: number, payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.put(`/admin/store-faqs/${id}`, payload);
    return response.data;
  }

  async deleteAdminStoreFaq(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.delete(`/admin/store-faqs/${id}`);
    return response.data;
  }

  async getAdminStoreCatalog(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.get(`/admin/store-catalogs/${id}`);
    return response.data;
  }

  async createAdminStoreCatalog(payload: Record<string, unknown> | FormData): Promise<ApiResponse<unknown>> {
    const response = await this.api.post('/admin/store-catalogs', payload);
    return response.data;
  }

  async updateAdminStoreCatalog(id: number, payload: Record<string, unknown> | FormData): Promise<ApiResponse<unknown>> {
    const response = await this.api.put(`/admin/store-catalogs/${id}`, payload);
    return response.data;
  }

  async deleteAdminStoreCatalog(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.delete(`/admin/store-catalogs/${id}`);
    return response.data;
  }

  async getAdminToken(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.get(`/admin/tokens/${id}`);
    return response.data;
  }

  async createAdminToken(payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.post('/admin/tokens', payload);
    return response.data;
  }

  async updateAdminToken(id: number, payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.put(`/admin/tokens/${id}`, payload);
    return response.data;
  }

  async deleteAdminToken(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.delete(`/admin/tokens/${id}`);
    return response.data;
  }

  async getAdminTenant(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.get(`/admin/tenants/${id}`);
    return response.data;
  }

  async updateAdminTenant(id: number, payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.put(`/admin/tenants/${id}`, payload);
    return response.data;
  }

  async getAdminCustomer(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.get(`/admin/customers/${id}`);
    return response.data;
  }

  async createAdminCustomer(payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.post('/admin/customers', payload);
    return response.data;
  }

  async updateAdminCustomer(id: number, payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.put(`/admin/customers/${id}`, payload);
    return response.data;
  }

  async deleteAdminCustomer(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.delete(`/admin/customers/${id}`);
    return response.data;
  }

  async getAdminLead(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.get(`/admin/leads/${id}`);
    return response.data;
  }

  async createAdminLead(payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.post('/admin/leads', payload);
    return response.data;
  }

  async updateAdminLead(id: number, payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.put(`/admin/leads/${id}`, payload);
    return response.data;
  }

  async deleteAdminLead(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.delete(`/admin/leads/${id}`);
    return response.data;
  }

  async getAdminStore(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.get(`/admin/stores/${id}`);
    return response.data;
  }

  async createAdminStore(payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.post('/admin/stores', payload);
    return response.data;
  }

  async updateAdminStore(id: number, payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.put(`/admin/stores/${id}`, payload);
    return response.data;
  }

  async deleteAdminStore(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.delete(`/admin/stores/${id}`);
    return response.data;
  }

  async getAdminSalesman(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.get(`/admin/salesmen/${id}`);
    return response.data;
  }

  async createAdminSalesman(payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.post('/admin/salesmen', payload);
    return response.data;
  }

  async updateAdminSalesman(id: number, payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.put(`/admin/salesmen/${id}`, payload);
    return response.data;
  }

  async deleteAdminSalesman(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.delete(`/admin/salesmen/${id}`);
    return response.data;
  }

  async getAdminProduct(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.get(`/admin/products/${id}`);
    return response.data;
  }

  async createAdminProduct(payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.post('/admin/products', payload);
    return response.data;
  }

  async updateAdminProduct(id: number, payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.put(`/admin/products/${id}`, payload);
    return response.data;
  }

  async deleteAdminProduct(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.delete(`/admin/products/${id}`);
    return response.data;
  }

  async getAdminWarehouses(): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/warehouses');
    return response.data;
  }

  async createAdminWarehouse(payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.post('/admin/warehouses', payload);
    return response.data;
  }

  async getAdminStockMovements(params: { product_id: number; page?: number; per_page?: number }): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/stock-movements', { params });
    return response.data;
  }

  async getAdminStockLots(params: { product_id: number; page?: number; per_page?: number }): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/stock-lots', { params });
    return response.data;
  }

  async createAdminStockLot(payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.post('/admin/stock-lots', payload);
    return response.data;
  }

  async attachAdminStoreUser(userId: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.post('/admin/store-users/attach', { user_id: userId });
    return response.data;
  }

  async detachAdminStoreUser(userId: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.delete(`/admin/store-users/detach/${userId}`);
    return response.data;
  }

  async getAdminOrders(params?: Record<string, string | number | boolean | undefined>): Promise<ApiResponse<unknown>> {
    const response = await this.api.get("/admin/orders", { params });
    return response.data;
  }

  async getAdminOrder(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.get(`/admin/orders/${id}`);
    return response.data;
  }

  async getAdminSections(): Promise<ApiResponse<unknown>> {
    const response = await this.api.get("/admin/sections");
    return response.data;
  }

  async createAdminSection(payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.post("/admin/sections", payload);
    return response.data;
  }

  async updateAdminSection(id: number, payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.put(`/admin/sections/${id}`, payload);
    return response.data;
  }

  async deleteAdminSection(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.delete(`/admin/sections/${id}`);
    return response.data;
  }

  async getAdminBrands(): Promise<ApiResponse<unknown>> {
    const response = await this.api.get("/admin/brands");
    return response.data;
  }

  async createAdminBrand(payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.post("/admin/brands", payload);
    return response.data;
  }

  async updateAdminBrand(id: number, payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.put(`/admin/brands/${id}`, payload);
    return response.data;
  }

  async deleteAdminBrand(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.delete(`/admin/brands/${id}`);
    return response.data;
  }

  async getAdminMeasurementUnits(params?: { page?: number; per_page?: number }): Promise<ApiResponse<unknown>> {
    const response = await this.api.get("/admin/measurement-units", { params });
    return response.data;
  }

  async createAdminMeasurementUnit(payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.post("/admin/measurement-units", payload);
    return response.data;
  }

  async updateAdminMeasurementUnit(id: number, payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.api.put(`/admin/measurement-units/${id}`, payload);
    return response.data;
  }

  async deleteAdminMeasurementUnit(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.api.delete(`/admin/measurement-units/${id}`);
    return response.data;
  }

  // Método genérico para fazer requisições GET
  async get(url: string, params?: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get(url, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }
}

// Instância singleton da API
export const apiService = new ApiService();

// ===== INTERFACES DO SISTEMA TIM =====

// Interface para estabelecimento
export interface Establishment {
  id: number;
  name: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  manager_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  manager?: User;
  users?: User[];
}

/** Item do relatório GET /establishments/report */
export interface EstablishmentReportSeller {
  id: number;
  name: string;
  email: string;
  total_sales: number;
  total_revenue: number;
  sales: any[];
}

export interface EstablishmentReportItem {
  establishment: Establishment & { manager?: { id: number; name: string; email: string } };
  total_sales: number;
  total_revenue: number;
  average_sale_value: number;
  sellers: EstablishmentReportSeller[];
}

// Interface para categoria
export interface Category {
  id: number;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  products_count?: number;
}

// Interface para cliente
export interface Customer {
  id: number;
  name: string;
  nif: string;  // ← Mudança de cpf para nif
  email?: string;
  phone?: string;
  whatsapp?: string;
  birth_date?: string;
  zip_code?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  created_at: string;
  updated_at: string;
  sales_count?: number;
}

// Interface para venda
export interface Sale {
  id: number;
  customer_id: number;
  seller_id: number;
  establishment_id: number;
  category_id: number;
  product_id?: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  activation_number?: string;
  imei?: string;
  device_value?: number;
  payment_method?: string;
  meu_tim: boolean;
  debit_automatic: boolean;
  portability: boolean;
  provisional_number?: string;
  rescue: boolean;
  observations?: string;
  status: 'pending' | 'approved' | 'cancelled';
  approved_by?: number;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  seller?: User;
  establishment?: Establishment;
  category?: Category;
  product?: Product;
  approvedBy?: User;
}

// Interface para permissão
export interface Permission {
  id: number;
  name: string;
  module: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Interface para role (perfil de permissão)
export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  users_count: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  users?: User[];
}

// Interface para movimentação de estoque
export interface StockMovement {
  id: number;
  product_id: number;
  establishment_id: number;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason?: string;
  reference_id?: number;
  reference_type?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  product?: Product;
  establishment?: Establishment;
  createdBy?: User;
}

// Tipos já exportados acima
