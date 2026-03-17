import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Database, Download, Upload, Loader2, FileJson, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

const BACKUP_TABLES = [
  'categories',
  'contacts',
  'banks',
  'transactions',
  'recurring_transactions',
  'contact_partners',
  'contact_notes',
  'contact_documents',
  'contact_messages',
  'boleto_controls',
  'transaction_attachments',
] as const;

type TableName = typeof BACKUP_TABLES[number];

// Order matters for upsert (FK dependencies)
const RESTORE_ORDER: TableName[] = [
  'categories',
  'contacts',
  'banks',
  'recurring_transactions',
  'transactions',
  'contact_partners',
  'contact_notes',
  'contact_documents',
  'contact_messages',
  'boleto_controls',
  'transaction_attachments',
];

async function fetchAllRows(table: string, extraFilter?: (q: any) => any) {
  const PAGE = 1000;
  let all: any[] = [];
  let from = 0;
  let hasMore = true;
  while (hasMore) {
    let query = (supabase.from as any)(table).select('*').range(from, from + PAGE - 1);
    if (extraFilter) query = extraFilter(query);
    const { data, error } = await query;
    if (error) throw new Error(`Erro ao buscar ${table}: ${error.message}`);
    if (!data || data.length === 0) { hasMore = false; break; }
    all = all.concat(data);
    if (data.length < PAGE) hasMore = false;
    else from += PAGE;
  }
  return all;
}

interface BackupPayload {
  version: number;
  exported_at: string;
  tables: Record<string, any[]>;
}

function validateBackup(obj: any): obj is BackupPayload {
  if (!obj || typeof obj !== 'object') return false;
  if (typeof obj.version !== 'number' || !obj.tables || typeof obj.tables !== 'object') return false;
  for (const key of Object.keys(obj.tables)) {
    if (!Array.isArray(obj.tables[key])) return false;
  }
  return true;
}

export default function BackupTab() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreStep, setRestoreStep] = useState('');
  const [pendingFile, setPendingFile] = useState<BackupPayload | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // ── EXPORT ──
  const handleExport = async () => {
    setExporting(true);
    try {
      const tables: Record<string, any[]> = {};
      for (const table of BACKUP_TABLES) {
        const extra = table === 'transactions'
          ? (q: any) => q.is('deleted_at', null)
          : undefined;
        tables[table] = await fetchAllRows(table, extra);
      }
      const payload: BackupPayload = {
        version: 1,
        exported_at: new Date().toISOString(),
        tables,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_contabilidade_${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const totalRows = Object.values(tables).reduce((s, arr) => s + arr.length, 0);
      toast.success(`Backup exportado com sucesso! (${totalRows.toLocaleString('pt-BR')} registros)`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao exportar backup');
    } finally {
      setExporting(false);
    }
  };

  // ── FILE HANDLING ──
  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.json')) {
      toast.error('Selecione um arquivo .json válido');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!validateBackup(parsed)) {
          toast.error('Estrutura do arquivo inválida. Esperado: { version, tables }');
          return;
        }
        setPendingFile(parsed);
        setShowConfirm(true);
      } catch {
        toast.error('Erro ao ler o arquivo JSON');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  // ── RESTORE ──
  const handleRestore = async () => {
    if (!pendingFile) return;
    setShowConfirm(false);
    setRestoring(true);
    setRestoreProgress(0);

    const totalSteps = RESTORE_ORDER.filter(t => pendingFile.tables[t]?.length).length;
    let done = 0;

    try {
      for (const table of RESTORE_ORDER) {
        const rows = pendingFile.tables[table];
        if (!rows || rows.length === 0) continue;

        setRestoreStep(`Restaurando ${table} (${rows.length} registros)...`);

        // Upsert in batches of 500
        const BATCH = 500;
        for (let i = 0; i < rows.length; i += BATCH) {
          const batch = rows.slice(i, i + BATCH);
          const { error } = await (supabase.from as any)(table).upsert(batch, { onConflict: 'id' });
          if (error) throw new Error(`Erro em ${table}: ${error.message}`);
        }

        done++;
        setRestoreProgress(Math.round((done / totalSteps) * 100));
      }

      toast.success('Restauração concluída! Recarregando o sistema...');
      queryClient.invalidateQueries();
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      toast.error(err.message || 'Erro durante a restauração');
      setRestoring(false);
      setRestoreProgress(0);
      setRestoreStep('');
    } finally {
      setPendingFile(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Card */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Exportar Backup</CardTitle>
              <CardDescription>Baixe todos os dados do sistema em formato JSON</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            O backup inclui: transações, clientes, categorias, bancos, recorrências, sócios, anotações, documentos, mensagens, boletos e anexos.
          </p>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {exporting ? 'Exportando...' : 'Exportar Backup (JSON)'}
          </Button>
        </CardContent>
      </Card>

      {/* Restore Card */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Upload className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <CardTitle>Restaurar Backup</CardTitle>
              <CardDescription>Importe um arquivo JSON de backup para restaurar os dados</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              A restauração pode sobrescrever dados existentes. Registros com o mesmo ID serão atualizados; registros ausentes serão recriados.
            </p>
          </div>

          {restoring ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{restoreStep}</span>
              </div>
              <Progress value={restoreProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">{restoreProgress}%</p>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/30'}
              `}
            >
              <FileJson className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Arraste um arquivo .json aqui</p>
              <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirmar Restauração
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>Atenção:</strong> A restauração pode sobrescrever dados atuais. Deseja continuar?
              {pendingFile && (
                <span className="block mt-2 text-xs">
                  Arquivo exportado em: {format(new Date(pendingFile.exported_at), 'dd/MM/yyyy HH:mm')}
                  {' · '}
                  {Object.entries(pendingFile.tables)
                    .filter(([, v]) => v.length > 0)
                    .map(([k, v]) => `${k}: ${v.length}`)
                    .join(', ')}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} className="bg-amber-600 hover:bg-amber-700 text-white">
              Sim, Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
