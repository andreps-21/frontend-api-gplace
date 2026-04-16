import { apiService, Category } from './api'

// Interface para compatibilidade com o sistema antigo
export interface CategoriaVenda {
  id: number
  nome: string
  descricao: string
  cor: string
  ativo: boolean
  vendas: number
}

// Cache local para categorias
let categoriasCache: CategoriaVenda[] = []
let lastFetch: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

// Função para converter Category da API para CategoriaVenda
const convertCategoryToCategoriaVenda = (category: Category): CategoriaVenda => ({
  id: category.id,
  nome: category.name,
  descricao: category.description || '',
  cor: category.color || '#0026d9',
  ativo: category.is_active,
  vendas: 0 // Será calculado dinamicamente
})

// Função para buscar categorias da API
const fetchCategoriasFromAPI = async (): Promise<CategoriaVenda[]> => {
  try {
    console.log('🔄 Tentando buscar categorias da API...')
    const response = await apiService.getCategories()
    const categories = response.data.data || response.data
    console.log('✅ Categorias carregadas da API:', categories.length)
    return categories.map(convertCategoryToCategoriaVenda)
  } catch (error: any) {
    console.warn('⚠️ Erro ao buscar categorias da API:', error.message || error)
    console.log('📋 Usando categorias padrão como fallback')
    // Retorna dados padrão em caso de erro
    return getDefaultCategorias()
  }
}

// Dados padrão para fallback
const getDefaultCategorias = (): CategoriaVenda[] => [
  { 
    id: 1, 
    nome: "FAMILIA", 
    descricao: "Planos familiares que permitem compartilhar franquias de dados, minutos e benefícios entre diferentes linhas de um mesmo titular.", 
    cor: "#0026d9", 
    ativo: true,
    vendas: 0 
  },
  { 
    id: 2, 
    nome: "POS_PAGO", 
    descricao: "Planos pós-pagos voltados para clientes que desejam maior franquia de internet, ligações ilimitadas e benefícios inclusos em um pacote mensal.", 
    cor: "#0026d9", 
    ativo: true,
    vendas: 0 
  },
  { 
    id: 3, 
    nome: "CONTROLE", 
    descricao: "Planos controle com valor fixo mensal, oferecendo equilíbrio entre custo e benefícios, com internet, chamadas e aplicativos inclusos.", 
    cor: "#0026d9", 
    ativo: true,
    vendas: 0 
  },
  { 
    id: 4, 
    nome: "PRE_PAGO", 
    descricao: "Planos pré-pagos onde o cliente realiza recargas conforme necessidade, garantindo flexibilidade e controle total sobre os gastos.", 
    cor: "#0026d9", 
    ativo: true,
    vendas: 0 
  },
  { 
    id: 5, 
    nome: "FIBRA", 
    descricao: "Serviços de internet banda larga com tecnologia de fibra óptica, oferecendo alta velocidade, estabilidade e opções com serviços de streaming inclusos.", 
    cor: "#0026d9", 
    ativo: true,
    vendas: 0 
  },
  { 
    id: 6, 
    nome: "UPGRADE", 
    descricao: "Opções de migração entre planos, permitindo evoluir de um pacote para outro conforme as necessidades do cliente, com ajustes de benefícios e valores.", 
    cor: "#0026d9", 
    ativo: true,
    vendas: 0 
  },
  { 
    id: 7, 
    nome: "APARELHO", 
    descricao: "Venda de aparelhos vinculados a planos, com opções de pagamento à vista ou parcelado e integração com controle de IMEI e nota fiscal.", 
    cor: "#0026d9", 
    ativo: true,
    vendas: 0 
  },
  { 
    id: 8, 
    nome: "ACESSÓRIO", 
    descricao: "Itens complementares como capas, fones, carregadores e demais produtos que acompanham o aparelho ou podem ser vendidos separadamente.", 
    cor: "#0026d9", 
    ativo: true,
    vendas: 0 
  },
  { 
    id: 9, 
    nome: "CHIP", 
    descricao: "Ativação e gerenciamento de chips novos ou de resgate, incluindo linhas pré-pagas e controle, conforme a necessidade do cliente.", 
    cor: "#0026d9", 
    ativo: true,
    vendas: 0 
  }
]

// Função para obter categorias (com cache)
export const getCategoriasVendas = async (): Promise<CategoriaVenda[]> => {
  const now = Date.now()
  
  // Verifica se o cache ainda é válido
  if (categoriasCache.length > 0 && (now - lastFetch) < CACHE_DURATION) {
    return categoriasCache
  }
  // Busca da API
  categoriasCache = await fetchCategoriasFromAPI()
  lastFetch = now
  
  return categoriasCache
}

// Função para invalidar cache
export const invalidateCategoriasCache = (): void => {
  categoriasCache = []
  lastFetch = 0
}

// Função para obter apenas os nomes das categorias ativas (para o formulário de vendas)
export const getCategoriasAtivas = async (): Promise<string[]> => {
  const categorias = await getCategoriasVendas()
  return categorias
    .filter(categoria => categoria.ativo)
    .map(categoria => categoria.nome)
}

// Função para obter categoria por nome
export const getCategoriaPorNome = async (nome: string): Promise<CategoriaVenda | undefined> => {
  const categorias = await getCategoriasVendas()
  return categorias.find(categoria => categoria.nome === nome)
}

// Função para atualizar categoria via API
export const atualizarCategoria = async (categoriaAtualizada: CategoriaVenda): Promise<CategoriaVenda> => {
  try {
    const categoryData = {
      name: categoriaAtualizada.nome,
      description: categoriaAtualizada.descricao,
      color: categoriaAtualizada.cor,
      is_active: categoriaAtualizada.ativo
    }
    
    const response = await apiService.updateCategory(categoriaAtualizada.id, categoryData)
    const updatedCategory = convertCategoryToCategoriaVenda(response.data)
    
    // Atualiza cache local
    const index = categoriasCache.findIndex(cat => cat.id === categoriaAtualizada.id)
    if (index !== -1) {
      categoriasCache[index] = updatedCategory
    }
    
    return updatedCategory
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error)
    throw error
  }
}

// Função para adicionar nova categoria via API
export const adicionarCategoria = async (novaCategoria: Omit<CategoriaVenda, 'id'>): Promise<CategoriaVenda> => {
  try {
    const categoryData = {
      name: novaCategoria.nome,
      description: novaCategoria.descricao,
      color: novaCategoria.cor,
      is_active: novaCategoria.ativo
    }
    
    const response = await apiService.createCategory(categoryData)
    const categoriaCompleta = convertCategoryToCategoriaVenda(response.data)
    
    // Adiciona ao cache local
    categoriasCache.push(categoriaCompleta)
    
    return categoriaCompleta
  } catch (error) {
    console.error('Erro ao adicionar categoria:', error)
    throw error
  }
}

// Função para remover categoria via API
export const removerCategoria = async (id: number): Promise<boolean> => {
  try {
    await apiService.deleteCategory(id)
    
    // Remove do cache local
    const index = categoriasCache.findIndex(cat => cat.id === id)
    if (index !== -1) {
      categoriasCache.splice(index, 1)
    }
    
    return true
  } catch (error) {
    console.error('Erro ao remover categoria:', error)
    return false
  }
}

// Função para incrementar contador de vendas (apenas local)
export const incrementarVendasCategoria = (nomeCategoria: string): void => {
  const categoria = categoriasCache.find(cat => cat.nome === nomeCategoria)
  if (categoria) {
    categoria.vendas += 1
  }
}

// Função para obter categorias ativas síncrona (para compatibilidade)
export const getCategoriasAtivasSync = (): string[] => {
  return categoriasCache
    .filter(categoria => categoria.ativo)
    .map(categoria => categoria.nome)
}
