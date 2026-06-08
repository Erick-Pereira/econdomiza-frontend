import { AlertTriangle, Box, FileSearch, Inbox } from 'lucide-react';
import { EmptyState } from './EmptyState';

/** Pre-definidos de estados vazios comuns */
export const EMPTY_VARIANTS = {
  /** Nada encontrado — busca sem resultados */
  nothing: ({
    icon,
    title,
    description,
  }: {
    icon?: React.ReactNode;
    title: string;
    description?: string;
  }) => (
    <EmptyState
      icon={icon || <FileSearch className="h-12 w-12 text-slate-400" />}
      title={title || 'Nada encontrado'}
      description={description}
    />
  ),

  /** Sem dados — lista vazia (não erro) */
  emptyList: ({ title, description }: { title: string; description?: string }) => (
    <EmptyState
      icon={<Inbox className="h-12 w-12 text-slate-400" />}
      title={title || 'Lista vazia'}
      description={description || 'Ainda não há itens nesta lista.'}
    />
  ),

  /** Sem dados de carregar (loading inicial) */
  loading: ({ title }: { title?: string }) => (
    <div className="flex min-h-[400px] flex-col items-center justify-center px-4">
      <Box className="mb-4 h-12 w-12 animate-spin text-slate-400" />
      <p className="text-sm text-slate-500">{title || 'Carregando...'}</p>
    </div>
  ),

  /** Erro ou problema */
  error: ({ title, description }: { title: string; description?: string }) => (
    <EmptyState
      icon={<AlertTriangle className="h-12 w-12 text-amber-500" />}
      title={title || 'Ocorreu um erro'}
      description={description}
    />
  ),
};
