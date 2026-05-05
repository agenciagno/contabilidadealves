import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useCompany } from '@/hooks/useCompany';

interface ModuleGuardProps {
  moduleName: string;
  children: ReactNode;
}

export function ModuleGuard({ moduleName, children }: ModuleGuardProps) {
  const { isSuperAdmin, allowedModules, isLoading } = useUserRole();
  const { company } = useCompany();

  // While loading, don't redirect
  if (isLoading) return null;

  if (isSuperAdmin) return <>{children}</>;

  const planModules: string[] = (company as any)?.plan_modules ?? [
    'home', 'legalizacao', 'fiscal', 'pessoal_rh', 'financeiro', 'clientes', 'configuracoes',
  ];

  const hasAccess = planModules.includes(moduleName) && allowedModules.includes(moduleName);

  if (!hasAccess) {
    return <Navigate to="/sem-acesso" replace />;
  }

  return <>{children}</>;
}
