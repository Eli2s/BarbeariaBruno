import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import {
  Home, Users, CreditCard, Package, Scissors, ShoppingBag,
  MessageSquare, Settings, LogOut, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/clientes', icon: Users, label: 'Clientes' },
  { path: '/planos', icon: CreditCard, label: 'Planos' },
  { path: '/produtos', icon: Package, label: 'Produtos' },
  { path: '/barbeiros', icon: Scissors, label: 'Barbeiros' },
  { path: '/servicos-cadastrados', icon: Sparkles, label: 'Serviços' },
  { path: '/pedidos', icon: ShoppingBag, label: 'Pedidos' },
  { path: '/mensagens', icon: MessageSquare, label: 'Mensagens' },
  { path: '/menu', icon: Settings, label: 'Configurações' },
];

export function DesktopSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore(s => s.logout);

  return (
    <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border h-screen sticky top-0 shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <h1 className="text-lg font-bold gradient-text">Bruno Barbearia</h1>
        <p className="text-[10px] text-muted-foreground">Sistema de Gestão</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={() => { logout(); navigate('/login'); }}
        >
          <LogOut size={18} /> Sair
        </Button>
      </div>
    </aside>
  );
}
