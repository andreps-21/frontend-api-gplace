// lib/hooks/use-document-permissions.ts
import { useAuth } from '@/lib/auth';

// Interface para venda (para validação de acesso)
export interface Sale {
  id: number;
  seller_id: number | null;
  establishment_id: number | null;
}

export function useDocumentPermissions(sale?: Sale) {
  const { user } = useAuth();

  const isVendedor = user?.role === 'vendedor';
  const isGerente = user?.role === 'gerente';
  const isGestor = user?.role === 'gestor';
  const isMaster = user?.role === 'master' || user?.role === 'administrador';

  // Vendedores e Gerentes NUNCA podem visualizar detalhes nem baixar
  const canViewDetails = !isVendedor && !isGerente;
  const canDownload = !isVendedor && !isGerente;
  const canUpload = true; // Todos podem fazer upload (com validação no backend)

  // Vendedores podem excluir apenas de suas próprias vendas
  // Gerentes podem excluir de vendas do seu estabelecimento
  // Gestores e Masters podem excluir de qualquer venda
  const canDelete = (() => {
    if (isGestor || isMaster) return true;
    if (isVendedor && sale && sale.seller_id === user?.id) return true;
    if (isGerente && sale && sale.establishment_id === user?.establishment_id) return true;
    return false;
  })();

  return {
    isVendedor,
    isGerente,
    isGestor,
    isMaster,
    canViewDetails,
    canDownload,
    canUpload,
    canDelete,
  };
}


