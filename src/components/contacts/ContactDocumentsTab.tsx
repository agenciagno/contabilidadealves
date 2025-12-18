import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  FileSpreadsheet,
  FileImage,
  File,
  FolderOpen
} from 'lucide-react';
import { useContactDocuments, ContactDocument } from '@/hooks/useContactDocuments';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContactDocumentsTabProps {
  contactId: string;
}

const getFileIcon = (fileType: string | null) => {
  const type = fileType?.toLowerCase();
  if (type === 'pdf') return <FileText className="h-4 w-4 text-red-500" />;
  if (['xls', 'xlsx', 'csv'].includes(type || '')) return <FileSpreadsheet className="h-4 w-4 text-emerald-500" />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type || '')) return <FileImage className="h-4 w-4 text-blue-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function ContactDocumentsTab({ contactId }: ContactDocumentsTabProps) {
  const { documents, isLoading, uploadDocument, deleteDocument, downloadDocument } = useContactDocuments(contactId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<ContactDocument | null>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    for (const file of Array.from(files)) {
      await uploadDocument.mutateAsync({ file, contactId });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    await handleFileSelect(e.dataTransfer.files);
  };

  const handleConfirmDelete = async () => {
    if (documentToDelete) {
      await deleteDocument.mutateAsync(documentToDelete);
      setDocumentToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Documentos do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200
              ${isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }
            `}
          >
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium">
              Arraste arquivos aqui ou clique para fazer upload
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, DOC, XLS, PNG, JPG (máx. 10MB)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Arquivos Salvos</CardTitle>
        </CardHeader>
        <CardContent>
          {documents && documents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Data Upload</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getFileIcon(doc.file_type)}
                        <span className="font-medium truncate max-w-[200px]" title={doc.file_name}>
                          {doc.file_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(doc.uploaded_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium uppercase text-muted-foreground">
                        {doc.file_type || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatFileSize(doc.file_size)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => downloadDocument(doc)}
                          title="Baixar"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDocumentToDelete(doc)}
                          className="text-destructive hover:text-destructive"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum documento enviado ainda
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o arquivo "{documentToDelete?.file_name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
