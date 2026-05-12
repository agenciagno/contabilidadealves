import { ReactNode, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { DevEnvironmentBanner } from './DevEnvironmentBanner';
import { InadimplentToast } from '@/components/notifications/InadimplentToast';
import { ForcePasswordChange } from '@/components/auth/ForcePasswordChange';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useAuth();
  const { forcePasswordChange, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  // Realtime session revocation listener
  useEffect(() => {
    const sessionUuid = localStorage.getItem('session_uuid');
    if (!user || !sessionUuid) return;

    const channel = supabase
      .channel('session-control')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'active_sessions',
          filter: `session_uuid=eq.${sessionUuid}`,
        },
        async () => {
          localStorage.removeItem('session_uuid');
          await supabase.auth.signOut();
          window.location.href = '/auth?reason=session_revoked';
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

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
        <SidebarInset className="flex-1 min-w-0">
          <DevEnvironmentBanner />
          <AppHeader />
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 min-w-0 max-w-full">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
