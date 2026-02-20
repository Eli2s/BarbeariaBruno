import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { exportClients, exportServices, exportPlans } from '@/lib/csv';
import { clearAndReseed } from '@/db/seed';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sun, Moon, Download, LogOut, Scissors, Package, ShoppingBag, Store, Share2, Copy, Users, MessageSquare, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function MenuPage() {
  const navigate = useNavigate();
  const logout = useAuthStore(s => s.logout);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  };

  const [reseeding, setReseeding] = useState(false);

  const handleExport = async (type: 'clients' | 'services' | 'plans') => {
    if (type === 'clients') await exportClients();
    else if (type === 'services') await exportServices();
    else await exportPlans();
    toast.success('Arquivo exportado!');
  };

  const handleClearReseed = async () => {
    setReseeding(true);
    try {
      await clearAndReseed();
      toast.success('Dados demo recarregados com sucesso!');
    } catch {
      toast.error('Erro ao recarregar dados.');
    } finally {
      setReseeding(false);
    }
  };

  const storeUrl = `${window.location.origin}/loja`;

  const handleShareStore = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Bruno Barbearia — Loja',
          text: '🔥 Confira os produtos da Bruno Barbearia!',
          url: storeUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(storeUrl);
      toast.success('Link da loja copiado!');
    }
  };

  return (
    <AppLayout>
      <div className="p-4 max-w-lg md:max-w-4xl mx-auto space-y-4">
        <h1 className="text-xl font-bold pt-2">Menu</h1>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDark ? <Moon size={18} /> : <Sun size={18} />}
              <Label className="cursor-pointer">Modo {isDark ? 'Escuro' : 'Claro'}</Label>
            </div>
            <Switch checked={isDark} onCheckedChange={toggleTheme} />
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate('/barbeiros')}>
          <CardContent className="p-4 flex items-center gap-3">
            <Users size={18} />
            <div>
              <p className="text-sm font-semibold">Barbeiros</p>
              <p className="text-xs text-muted-foreground">Cadastrar barbeiros e comissões</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate('/servicos-cadastrados')}>
          <CardContent className="p-4 flex items-center gap-3">
            <Scissors size={18} />
            <div>
              <p className="text-sm font-semibold">Gerenciar Serviços</p>
              <p className="text-xs text-muted-foreground">Cadastrar e editar serviços</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate('/produtos')}>
          <CardContent className="p-4 flex items-center gap-3">
            <Package size={18} />
            <div>
              <p className="text-sm font-semibold">Gerenciar Produtos</p>
              <p className="text-xs text-muted-foreground">Cadastrar e editar produtos</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate('/pedidos')}>
          <CardContent className="p-4 flex items-center gap-3">
            <ShoppingBag size={18} />
            <div>
              <p className="text-sm font-semibold">Pedidos da Loja</p>
              <p className="text-xs text-muted-foreground">Ver pedidos realizados pelos clientes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate('/mensagens')}>
          <CardContent className="p-4 flex items-center gap-3">
            <MessageSquare size={18} />
            <div>
              <p className="text-sm font-semibold">Mensagens WhatsApp</p>
              <p className="text-xs text-muted-foreground">Editar templates de mensagens</p>
            </div>
          </CardContent>
        </Card>

        {/* Store Link Card */}
        <Card className="border-primary/30 overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                <Store size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Minha Loja</p>
                <p className="text-[10px] text-muted-foreground font-mono truncate">{storeUrl}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" className="gap-1.5 text-xs" onClick={() => window.open(storeUrl, '_blank')}>
                <Store size={14} /> Abrir Loja
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleShareStore}>
                <Share2 size={14} /> Compartilhar
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-1.5 text-xs text-muted-foreground"
              onClick={() => { navigator.clipboard.writeText(storeUrl); toast.success('Link copiado!'); }}
            >
              <Copy size={12} /> Copiar link
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold flex items-center gap-2"><Download size={16} /> Exportar Dados</p>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => handleExport('clients')}>Clientes</Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => handleExport('services')}>Atendimentos</Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => handleExport('plans')}>Planos</Button>
            </div>
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full gap-2 text-muted-foreground"
          onClick={handleClearReseed}
          disabled={reseeding}
        >
          <RefreshCw size={16} className={reseeding ? 'animate-spin' : ''} />
          {reseeding ? 'Recarregando...' : 'Recarregar Dados Demo'}
        </Button>

        <Button
          variant="outline"
          className="w-full gap-2 text-destructive hover:text-destructive"
          onClick={() => { logout(); navigate('/login'); }}
        >
          <LogOut size={16} /> Sair
        </Button>

        <p className="text-center text-[10px] text-muted-foreground pt-4">Bruno Barbearia v1.0.0</p>
      </div>
    </AppLayout>
  );
}
