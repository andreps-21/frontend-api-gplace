"use client"

import React, { useState } from 'react';
import { apiService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Download, 
  Trash2, 
  Eye, 
  Calendar,
  User,
  Loader2,
  AlertCircle,
  Upload
} from 'lucide-react';
import { notifications } from '@/lib/notifications';
import { useSaleDocuments, type Document, type Sale } from '@/lib/hooks/use-sale-documents';
import { useDocumentPermissions } from '@/lib/hooks/use-document-permissions';
import { handleDocumentError } from '@/lib/utils/document-error-handler';

interface SaleDocumentsListProps {
  saleId: number;
  sale?: Sale;
  userRole?: string;
  onDocumentDeleted?: () => void;
  onUpload?: () => void;
}

export function SaleDocumentsList({ saleId, sale, userRole, onDocumentDeleted, onUpload }: SaleDocumentsListProps) {
  const { documents, loading, error, canAccessSale, canViewDetails, canDownload, isVendedor, isGerente } = useSaleDocuments(saleId, sale);
  const { canDelete } = useDocumentPermissions(sale);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleDownload = async (doc: Document) => {
    if (!canDownload) {
      notifications.custom.error('Você não tem permissão para baixar documentos');
      return;
    }

    try {
      setDownloading(doc.id);
      console.log('📥 Iniciando download do documento:', {
        saleId,
        documentId: doc.id,
        fileName: doc.original_name
      });
      
      const blob = await apiService.downloadDocument(saleId, doc.id);
      
      // Criar URL para download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.original_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      notifications.custom.success('Documento baixado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao baixar documento:', err);
      const errorInfo = handleDocumentError(err);
      
      if (errorInfo.type === 'permission') {
        notifications.custom.error('Você não tem permissão para baixar este documento');
      } else {
        notifications.custom.error(errorInfo.message);
      }
    } finally {
      setDownloading(null);
    }
  };

  const handleViewDocument = async (doc: Document) => {
    if (!canViewDetails) {
      notifications.custom.error('Você não tem permissão para visualizar documentos');
      return;
    }

    try {
      // Se tiver file_url, usar diretamente
      if (doc.file_url) {
        window.open(doc.file_url, '_blank');
        return;
      }

      // Caso contrário, tentar buscar o documento
      const response = await apiService.getSaleDocuments(saleId);
      const docList = Array.isArray(response.data) ? response.data : [];
      const foundDoc = docList.find((d: any) => d.id === doc.id);
      
      if (foundDoc?.file_url) {
        window.open(foundDoc.file_url, '_blank');
      } else {
        notifications.custom.error('URL do documento não disponível');
      }
    } catch (err: any) {
      const errorInfo = handleDocumentError(err);
      notifications.custom.error(errorInfo.message);
    }
  };

  const handleDelete = async (documentId: number) => {
    if (!canDelete) {
      notifications.custom.error('Você não tem permissão para excluir documentos');
      return;
    }

    const confirmed = window.confirm('Tem certeza que deseja excluir este documento?');
    if (!confirmed) return;

    try {
      setDeleting(documentId);
      console.log('🗑️ Iniciando exclusão do documento:', {
        saleId,
        documentId
      });
      
      await apiService.deleteDocument(saleId, documentId);
      
      notifications.custom.success('Documento excluído com sucesso!');
      
      if (onDocumentDeleted) {
        onDocumentDeleted();
      }
      
      // Recarregar a página para atualizar a lista
      window.location.reload();
    } catch (err: any) {
      console.error('Erro ao excluir documento:', err);
      const errorInfo = handleDocumentError(err);
      notifications.custom.error(errorInfo.message);
    } finally {
      setDeleting(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDocumentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'contrato': 'bg-blue-100 text-blue-800',
      'comprovante': 'bg-green-100 text-green-800',
      'identidade': 'bg-purple-100 text-purple-800',
      'cpf': 'bg-orange-100 text-orange-800',
      'comprovante_endereco': 'bg-pink-100 text-pink-800',
      'rg': 'bg-purple-100 text-purple-800',
      'comprovante_renda': 'bg-yellow-100 text-yellow-800',
      'termo_aceite': 'bg-indigo-100 text-indigo-800',
      'autorizacao': 'bg-teal-100 text-teal-800',
      'outros': 'bg-gray-100 text-gray-800'
    };
    return colors[type.toLowerCase()] || colors['outros'];
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'contrato': 'Contrato',
      'comprovante': 'Comprovante',
      'identidade': 'Identidade',
      'cpf': 'CPF',
      'rg': 'RG',
      'comprovante_endereco': 'Comprovante de Endereço',
      'comprovante_renda': 'Comprovante de Renda',
      'termo_aceite': 'Termo de Aceite',
      'autorizacao': 'Autorização',
      'outros': 'Outros'
    };
    return labels[type.toLowerCase()] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-muted-foreground">Carregando documentos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Validar acesso à venda
  if (!canAccessSale) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Você não tem permissão para ver documentos desta venda.</AlertDescription>
      </Alert>
    );
  }

  // Renderizar lista completa (todos recebem lista completa segundo documentação)
  if (documents.length === 0) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Documentos Anexados</h3>
            {onUpload && (
              <Button
                onClick={onUpload}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                Anexar Documento
              </Button>
            )}
          </div>
          
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Nenhum documento anexado
              </h3>
              <p className="text-sm text-muted-foreground">
                Esta venda ainda não possui documentos anexados.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Documentos Anexados</h3>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">
              {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
            </Badge>
            {onUpload && (
              <Button
                onClick={onUpload}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                Anexar Documento
              </Button>
            )}
          </div>
        </div>

        {/* Aviso informativo para vendedores e gerentes sobre limitações */}
        {(isVendedor || isGerente) && documents.length > 0 && (
          <Alert variant="default" className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Você pode ver a lista completa e excluir documentos, mas não pode visualizar detalhes nem baixá-los.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex-shrink-0">
                      <FileText className="h-8 w-8 text-blue-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-foreground truncate">
                          {doc.original_name}
                        </h4>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getDocumentTypeColor(doc.document_type)}`}
                        >
                          {getDocumentTypeLabel(doc.document_type)}
                        </Badge>
                      </div>
                      
                      {doc.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {doc.description}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(doc.created_at)}
                        </span>
                        
                        {doc.user && (
                          <span className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {doc.user.name}
                          </span>
                        )}
                        
                        <span>{doc.file_size_human || formatFileSize(doc.file_size)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {canViewDetails && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDocument(doc)}
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {canDownload && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        disabled={downloading === doc.id}
                        title="Baixar"
                      >
                        {downloading === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    
                    {canDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(doc.id)}
                        disabled={deleting === doc.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Excluir"
                      >
                        {deleting === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
}
