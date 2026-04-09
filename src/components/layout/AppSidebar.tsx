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
  type LucideIcon,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';
import { usePinnedShortcuts, PinnedShortcut } from '@/hooks/usePinnedShortcuts';
import { useUserRole } from '@/hooks/useUserRole';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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

const iconMap: Record<string, LucideIcon> = {
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
  icon: LucideIcon;
  iconName: string;
}

interface MenuModule {
  title: string;
  icon: LucideIcon;
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
      { title: 'Conta Corrente', url: '/bancos', icon: Building2, iconName: 'building-2' },
      { title: 'Eventos Contábeis', url: '/categorias', icon: Tags, iconName: 'tags' },
      { title: 'DRE', url: '/dre', icon: FileBarChart, iconName: 'file-bar-chart' },
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
  {
    title: 'Fiscal',
    icon: FileCheck,
    moduleKey: 'fiscal',
    items: [
      { title: 'Tarefas', url: '/fiscal/tarefas', icon: CalendarClock, iconName: 'calendar-clock' },
    ],
  },
];

export function AppSidebar() {
  const { signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { companyName, companyCnpj, company } = useCompany();
  const { pinnedShortcuts, isPinned, togglePin } = usePinnedShortcuts();
  const { isSuperAdmin, isColaborador, allowedModules, fullName, avatarUrl } = useUserRole();
  const [profileOpen, setProfileOpen] = useState(false);

  const planModules: string[] = (company as any)?.plan_modules ?? ['financeiro', 'crm', 'configuracoes'];
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

  const showSettings = isSuperAdmin || !isColaborador;
  const initials = (fullName || 'U').substring(0, 2).toUpperCase();

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
            <IconComponent className="w-4 h-4 shrink-0" strokeWidth={1.5} />
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
    <>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border/40">
        <SidebarHeader className="p-3">
          <div className="flex items-center gap-3 justify-center">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0">
              <Building2 className="w-4 h-4 text-primary-foreground" strokeWidth={1.5} />
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
          {/* Home */}
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
                      <Home className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
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

          {/* Módulos */}
          {visibleModules.map((module) => (
            <SidebarGroup key={module.title}>
              <Collapsible
                open={openModules[module.title]}
                onOpenChange={() => handleToggleModule(module.title)}
              >
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent rounded-lg px-3 py-2.5 transition-colors">
                    <div className="flex items-center gap-3 text-sidebar-foreground">
                      <module.icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
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
                              <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
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
          <Separator className="bg-sidebar-border mb-3" />
          <SidebarMenu>
            {showSettings && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Configurações">
                  <NavLink 
                    to="/configuracoes"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                  >
                    <Settings className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
                    {!collapsed && <span>Configurações</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>

          <Separator className="bg-sidebar-border my-2" />

          {/* Profile + Logout */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2 flex-1 min-w-0 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors"
            >
              <Avatar className="w-8 h-8 shrink-0">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
                <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <span className="text-sm text-sidebar-foreground truncate">{fullName || 'Usuário'}</span>
              )}
            </button>
            <Button 
              variant="ghost" 
              size="icon"
              className="shrink-0 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={signOut}
              title="Sair"
            >
              <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}
