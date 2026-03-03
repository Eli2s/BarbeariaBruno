import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import {
  Home, Users, CreditCard, Package, Scissors, ShoppingBag,
  MessageSquare, Settings, LogOut, Sparkles, CalendarCheck,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const NAV_SECTIONS = [
  {
    title: 'Principal',
    items: [
      { path: '/', icon: Home, label: 'Dashboard' },
      { path: '/agendamentos', icon: CalendarCheck, label: 'Agendamentos' },
    ],
  },
  {
    title: 'Gestão',
    items: [
      { path: '/clientes', icon: Users, label: 'Clientes' },
      { path: '/planos', icon: CreditCard, label: 'Planos' },
      { path: '/barbeiros', icon: Scissors, label: 'Barbeiros' },
      { path: '/servicos-cadastrados', icon: Sparkles, label: 'Serviços' },
    ],
  },
  {
    title: 'Loja',
    items: [
      { path: '/produtos', icon: Package, label: 'Produtos' },
      { path: '/pedidos', icon: ShoppingBag, label: 'Pedidos' },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { path: '/mensagens', icon: MessageSquare, label: 'Mensagens' },
      { path: '/menu', icon: Settings, label: 'Configurações' },
    ],
  },
];

export function DesktopSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore(s => s.logout);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="hidden md:flex flex-col bg-card border-r border-border h-screen sticky top-0 shrink-0 overflow-hidden"
    >
      {/* Logo */}
      <div className="p-4 border-b border-border flex items-center justify-between min-h-[64px]">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="text-lg font-bold gradient-text whitespace-nowrap">Bruno Barbearia</h1>
              <p className="text-[10px] text-muted-foreground">Sistema de Gestão</p>
            </motion.div>
          )}
        </AnimatePresence>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 overflow-y-auto space-y-4">
        {NAV_SECTIONS.map(section => (
          <div key={section.title}>
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1"
                >
                  {section.title}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="space-y-0.5">
              {section.items.map(item => {
                const isActive = item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);

                const btn = (
                  <motion.button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg text-sm transition-all relative',
                      collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold sidebar-item-active'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebarActive"
                        className="absolute inset-0 bg-primary/10 rounded-lg"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className="relative z-10 shrink-0" />
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          className="relative z-10 whitespace-nowrap overflow-hidden"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.path} delayDuration={0}>
                      <TooltipTrigger asChild>{btn}</TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return btn;
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'w-full text-muted-foreground hover:text-destructive',
                collapsed ? 'justify-center px-2' : 'justify-start gap-3'
              )}
              onClick={() => { logout(); navigate('/login'); }}
            >
              <LogOut size={18} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Sair
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right">Sair</TooltipContent>
          )}
        </Tooltip>
      </div>
    </motion.aside>
  );
}
