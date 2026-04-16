// lib/hooks/use-sale-documents.ts
import { useState, useEffect } from 'react';
import { apiService } from '@/lib/api';
import { useAuth } from '@/lib/auth';

// Interface para documento completo
export interface Document {
  id: number;
  sale_id: number;
  document_type: string;
  original_name: string;
  file_name?: string;
  filename?: string; // Compatibilidade com formato antigo
  file_path?: string;
  mime_type: string;
  file_size: number;
  description?: string | null;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  file_url?: string;
  file_size_human?: string;
  file_extension?: string;
  user?: {
    id: number;
    name: string;
  };
}

// Interface para venda (para validação de acesso)
export interface Sale {
  id: number;
  seller_id: number | null;
  establishment_id: number | null;
}

// Tipo de resposta da API - sempre retorna lista completa segundo documentação
export type DocumentsResponse = Document[];

export function useSaleDocuments(saleId: number | null, sale?: Sale) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const isVendedor = user?.role === 'vendedor';
  const isGerente = user?.role === 'gerente';
  const isGestor = user?.role === 'gestor';
  const isMaster = user?.role === 'master' || user?.role === 'administrador';

  // Validar acesso à venda
  const canAccessSale = (() => {
    if (!sale) return true; // Se não tiver sale, assumir acesso (validação no backend)
    if (isGestor || isMaster) return true;
    if (isVendedor && sale.seller_id === user?.id) return true;
    if (isGerente && sale.establishment_id === user?.establishment_id) return true;
    return false;
  })();

  useEffect(() => {
    async function fetchDocuments() {
      if (!saleId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log('📋 Buscando documentos da venda:', saleId);
        const response = await apiService.getSaleDocuments(saleId);
        
        console.log('📥 Resposta da API:', response);
        
        // A resposta pode vir em response.data diretamente ou em response.data.data
        // Priorizar response.data.data se existir, senão usar response.data
        const responseData = response.data?.data !== undefined ? response.data.data : (response.data || response);
        
        // Segundo documentação, todos recebem lista completa
        if (Array.isArray(responseData)) {
          console.log('📋 Resposta é lista de documentos:', responseData.length, 'documentos');
          setDocuments(responseData);
        } else {
          console.warn('⚠️ Formato de resposta inesperado:', responseData);
          setDocuments([]);
        }
      } catch (err: any) {
        console.error('❌ Erro ao buscar documentos:', err);
        
        // Se for erro 403, não é um erro crítico - apenas não há permissão
        if (err.response?.status === 403) {
          setError('Você não tem permissão para visualizar documentos desta venda');
        } else {
          setError(err.response?.data?.message || 'Erro ao carregar documentos');
        }
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, [saleId]);

  // Vendedores e Gerentes NUNCA podem visualizar detalhes nem baixar
  const canViewDetails = !isVendedor && !isGerente;
  const canDownload = !isVendedor && !isGerente;

  return {
    documents,
    loading,
    error,
    canAccessSale,
    canViewDetails,
    canDownload,
    isVendedor,
    isGerente,
    isGestor,
    isMaster,
  };
}


