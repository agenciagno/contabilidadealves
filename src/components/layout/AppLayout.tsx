import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { InadimplentToast } from '@/components/notifications/InadimplentToast';
import { ForcePasswordChange } from '@/components/auth/ForcePasswordChange';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useAuth();
  const { forcePasswordChange, isLoading: roleLoading } = useUserRole();

  if (loading || (user && roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (forcePasswordChange) {
    return <ForcePasswordChange />;
  }

  return (
    <SidebarProvider>
      <InadimplentToast />
      <div className="min-h-screen flex w-full max-w-[100vw] overflow-x-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <AppHeader />
          <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
