import { useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/clientes': 'Clientes',
  '/planos': 'Planos',
  '/produtos': 'Produtos',
  '/barbeiros': 'Barbeiros',
  '/servicos-cadastrados': 'Serviços',
  '/pedidos': 'Pedidos',
  '/mensagens': 'Mensagens',
  '/menu': 'Configurações',
  '/atendimento': 'Novo Atendimento',
};

function getTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  if (pathname.startsWith('/clientes/')) return 'Cliente';
  if (pathname.startsWith('/planos/')) return 'Plano';
  return 'Bruno Barbearia';
}

export function DesktopHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  };

  return (
    <header className="hidden md:flex items-center justify-between h-16 px-6 border-b border-border bg-card sticky top-0 z-40">
      <h2 className="text-lg font-semibold">{getTitle(location.pathname)}</h2>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => navigate('/atendimento')} className="gap-1.5 font-semibold">
          <Plus size={16} /> Atendimento
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
      </div>
    </header>
  );
}
