import { useState } from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  ArrowUpDown,
  CalendarClock, 
  Users, 
  Building2, 
  Tags, 
  FileBarChart, 
  Settings,
  LogOut,
  Home,
  Pin,
  PinOff,
  ChevronDown,
  Send,
  Wallet,
  UserCircle,
  BarChart3,
  FileCheck,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';
import { usePinnedShortcuts, PinnedShortcut } from '@/hooks/usePinnedShortcuts';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'layout-dashboard': LayoutDashboard,
  'arrow-left-right': ArrowLeftRight,
  'arrow-up-down': ArrowUpDown,
  'calendar-clock': CalendarClock,
  'users': Users,
  'building-2': Building2,
  'tags': Tags,
  'file-bar-chart': FileBarChart,
  'send': Send,
  'user-circle': UserCircle,
  'bar-chart-3': BarChart3,
  'file-check': FileCheck,
};

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  iconName: string;
}

interface MenuModule {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  moduleKey?: string;
  items: MenuItem[];
}

const menuModules: MenuModule[] = [
  {
    title: 'Financeiro',
    icon: Wallet,
    moduleKey: 'financeiro',
    defaultOpen: true,
    items: [
      { title: 'Dashboard', url: '/painel-financeiro', icon: LayoutDashboard, iconName: 'layout-dashboard' },
      { title: 'Lançamentos', url: '/movimentacoes', icon: ArrowLeftRight, iconName: 'arrow-left-right' },
      { title: 'Pagar/Receber', url: '/financeiro/pagar-receber', icon: ArrowUpDown, iconName: 'arrow-up-down' },
      
      { title: 'Boletos', url: '/boletos', icon: FileCheck, iconName: 'file-check' },
      { title: 'Bancos', url: '/bancos', icon: Building2, iconName: 'building-2' },
      { title: 'Eventos Contábeis', url: '/categorias', icon: Tags, iconName: 'tags' },
    ],
  },
  {
    title: 'CRM / Clientes',
    icon: Users,
    moduleKey: 'crm',
    items: [
      { title: 'Cliente/Fornecedor', url: '/contatos', icon: UserCircle, iconName: 'user-circle' },
      { title: 'Disparos', url: '/disparos', icon: Send, iconName: 'send' },
    ],
  },
  // Módulos futuros — prontos para quando as páginas forem criadas
  // { title: 'Comercial', icon: BarChart3, moduleKey: 'comercial', items: [] },
  // { title: 'Fiscal', icon: FileBarChart, moduleKey: 'fiscal', items: [] },
  // { title: 'Pessoal / RH', icon: Users, moduleKey: 'pessoal_rh', items: [] },
];

export function AppSidebar() {
  const { signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { companyName, companyCnpj, company } = useCompany();
  const { pinnedShortcuts, isPinned, togglePin } = usePinnedShortcuts();
  const { isSuperAdmin, allowedModules } = useSuperAdmin();

  // Dynamic module filtering based on company plan + user permissions
  const planModules: string[] = (company as any)?.plan_modules ?? ['financeiro', 'crm', 'relatorios', 'configuracoes'];
  const visibleModules = isSuperAdmin
    ? menuModules
    : menuModules.filter((m) => {
        if (!m.moduleKey) return true;
        return planModules.includes(m.moduleKey) && allowedModules.includes(m.moduleKey);
      });

  const [openModules, setOpenModules] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    menuModules.forEach(mod => {
      initial[mod.title] = mod.defaultOpen ?? false;
    });
    return initial;
  });

  const handleToggleModule = (title: string) => {
    setOpenModules(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const handlePinClick = (e: React.MouseEvent, item: MenuItem) => {
    e.preventDefault();
    e.stopPropagation();
    togglePin({
      title: item.title,
      url: item.url,
      icon: item.iconName,
    });
  };

  const renderPinnedItem = (shortcut: PinnedShortcut) => {
    const IconComponent = iconMap[shortcut.icon] || Tags;
    return (
      <SidebarMenuItem key={shortcut.url}>
        <SidebarMenuButton asChild tooltip={shortcut.title}>
          <NavLink 
            to={shortcut.url}
            className="flex items-center gap-2 pl-8 pr-3 py-1.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors group text-sm"
            activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
          >
            <IconComponent className="w-3.5 h-3.5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 truncate">{shortcut.title}</span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    togglePin(shortcut);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <PinOff className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </button>
              </>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sidebar-foreground truncate">{companyName}</span>
              <span className="text-xs text-sidebar-foreground/60 truncate">{companyCnpj || 'CNPJ não informado'}</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <Separator className="bg-sidebar-border" />

      <SidebarContent className="px-2">
        {/* Home - Item único */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Home">
                  <NavLink 
                    to="/"
                    end
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                  >
                    <Home className="w-5 h-5 shrink-0" />
                    {!collapsed && <span>Home</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Atalhos Fixados */}
        {pinnedShortcuts.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider px-3 py-2">
              <Pin className="w-3 h-3 inline mr-1.5" />
              Atalhos
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {pinnedShortcuts.map(renderPinnedItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <Separator className="bg-sidebar-border my-2" />

        {/* Módulos com Acordeão */}
        {visibleModules.map((module) => (
          <SidebarGroup key={module.title}>
            <Collapsible
              open={openModules[module.title]}
              onOpenChange={() => handleToggleModule(module.title)}
            >
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent rounded-lg px-3 py-2.5 transition-colors">
                  <div className="flex items-center gap-3 text-sidebar-foreground">
                    <module.icon className="w-5 h-5" />
                    {!collapsed && <span className="text-sm font-semibold">{module.title}</span>}
                  </div>
                  {!collapsed && (
                    <ChevronDown 
                      className={cn(
                        "w-4 h-4 text-sidebar-foreground/50 transition-transform duration-200",
                        openModules[module.title] && "rotate-180"
                      )} 
                    />
                  )}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {module.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild tooltip={item.title}>
                          <NavLink 
                            to={item.url}
                            className="flex items-center gap-2 pl-8 pr-3 py-1.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors group text-sm"
                            activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                          >
                            <item.icon className="w-3.5 h-3.5 shrink-0" />
                            {!collapsed && (
                              <>
                                <span className="flex-1 truncate">{item.title}</span>
                                <button
                                  onClick={(e) => handlePinClick(e, item)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  {isPinned(item.url) ? (
                                    <PinOff className="w-3 h-3 text-primary" />
                                  ) : (
                                    <Pin className="w-3 h-3 text-muted-foreground hover:text-primary" />
                                  )}
                                </button>
                              </>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Separator className="bg-sidebar-border mb-4" />
        <SidebarMenu>
          {(isSuperAdmin || allowedModules.includes('configuracoes')) && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Configurações">
                <NavLink 
                  to="/configuracoes"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                >
                  <Settings className="w-5 h-5 shrink-0" />
                  {!collapsed && <span>Configurações</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent mt-2"
          onClick={signOut}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
