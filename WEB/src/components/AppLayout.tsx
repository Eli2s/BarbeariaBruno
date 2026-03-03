import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, CreditCard, CalendarCheck, Menu, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DesktopSidebar } from './DesktopSidebar';
import { DesktopHeader } from './DesktopHeader';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/agendamentos', icon: CalendarCheck, label: 'Agenda' },
  { path: '/clientes', icon: Users, label: 'Clientes' },
  { path: '/planos', icon: CreditCard, label: 'Planos' },
  { path: '/menu', icon: Menu, label: 'Menu' },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <DesktopSidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Desktop Header */}
        <DesktopHeader />

        {/* Content with page transition */}
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 pb-24 md:pb-6 overflow-y-auto"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>

      {/* ═══ Mobile Floating Bottom Nav ═══ */}
      <nav className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
        {/* FAB - Novo Atendimento */}
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 20 }}
          onClick={() => navigate('/atendimento')}
          className="absolute -top-14 right-2 w-12 h-12 rounded-full gradient-primary text-white flex items-center justify-center fab-button"
        >
          <Plus size={22} strokeWidth={2.5} />
        </motion.button>

        {/* Navigation Bar */}
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 30 }}
          className="floating-nav rounded-2xl"
        >
          <div className="flex items-center justify-around h-16 px-2">
            {NAV_ITEMS.map(item => {
              const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
              return (
                <motion.button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors relative min-w-[48px]',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <motion.div
                    animate={isActive ? { y: [0, -3, 0] } : {}}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  >
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  </motion.div>
                  <span className="text-[10px] font-medium relative z-10">{item.label}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </nav>
    </div>
  );
}
