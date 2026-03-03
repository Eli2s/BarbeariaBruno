import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { exportClients, exportServices, exportPlans } from '@/lib/csv';
import { clearAndReseed } from '@/db/seed';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sun, Moon, Download, LogOut, Store, Share2, Copy,
  RefreshCw, Building2, Clock, Percent, Bell, Shield,
  ChevronRight, Save, Smartphone
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings, useUpsertSetting } from '@/hooks/useSettings';

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const DEFAULT_HOURS = { open: '09:00', close: '19:00', enabled: true };

interface WorkingDay {
  open: string;
  close: string;
  enabled: boolean;
}

const SectionCard = ({ icon: Icon, title, description, children, defaultOpen = false }: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="overflow-hidden">
        <button
          className="w-full text-left"
          onClick={() => setOpen(!open)}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <ChevronRight
              size={18}
              className={`text-muted-foreground transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
            />
          </CardContent>
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border">
                <div className="pt-3">{children}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

export default function MenuPage() {
  const navigate = useNavigate();
  const logout = useAuthStore(s => s.logout);
  const [isDark, setIsDark] = useState(true);
  const [reseeding, setReseeding] = useState(false);

  // Settings
  const { data: settings } = useSettings();
  const upsertSetting = useUpsertSetting();

  const getSetting = (key: string, fallback: string = '') =>
    settings?.find(s => s.key === key)?.value ?? fallback;

  // Business info
  const [shopName, setShopName] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopAddress, setShopAddress] = useState('');

  // Working hours
  const [workingHours, setWorkingHours] = useState<WorkingDay[]>(
    DAYS.map(() => ({ ...DEFAULT_HOURS }))
  );

  // Cashback
  const [cashbackEnabled, setCashbackEnabled] = useState(false);
  const [cashbackPercent, setCashbackPercent] = useState('5');
  const [cashbackExpDays, setCashbackExpDays] = useState('30');

  // Notifications
  const [notifyConfirmation, setNotifyConfirmation] = useState(true);
  const [notifyReminder, setNotifyReminder] = useState(true);
  const [reminderHours, setReminderHours] = useState('2');

  // Appointment
  const [slotDuration, setSlotDuration] = useState('30');

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  useEffect(() => {
    if (!settings) return;
    setShopName(getSetting('shop_name', 'Bruno Barbearia'));
    setShopPhone(getSetting('shop_phone'));
    setShopAddress(getSetting('shop_address'));
    setCashbackEnabled(getSetting('cashback_enabled', 'false') === 'true');
    setCashbackPercent(getSetting('cashback_percent', '5'));
    setCashbackExpDays(getSetting('cashback_exp_days', '30'));
    setNotifyConfirmation(getSetting('notify_confirmation', 'true') === 'true');
    setNotifyReminder(getSetting('notify_reminder', 'true') === 'true');
    setReminderHours(getSetting('reminder_hours', '2'));
    setSlotDuration(getSetting('slot_duration', '30'));
    try {
      const saved = JSON.parse(getSetting('working_hours', '[]'));
      if (saved.length === 7) setWorkingHours(saved);
    } catch { /* use defaults */ }
  }, [settings]);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  };

  const saveSetting = async (key: string, value: string) => {
    await upsertSetting.mutateAsync({ key, value });
  };

  const handleSaveBusinessInfo = async () => {
    await Promise.all([
      saveSetting('shop_name', shopName),
      saveSetting('shop_phone', shopPhone),
      saveSetting('shop_address', shopAddress),
    ]);
    toast.success('Informações salvas!');
  };

  const handleSaveHours = async () => {
    await saveSetting('working_hours', JSON.stringify(workingHours));
    toast.success('Horários salvos!');
  };

  const handleSaveCashback = async () => {
    await Promise.all([
      saveSetting('cashback_enabled', String(cashbackEnabled)),
      saveSetting('cashback_percent', cashbackPercent),
      saveSetting('cashback_exp_days', cashbackExpDays),
    ]);
    toast.success('Configurações de cashback salvas!');
  };

  const handleSaveNotifications = async () => {
    await Promise.all([
      saveSetting('notify_confirmation', String(notifyConfirmation)),
      saveSetting('notify_reminder', String(notifyReminder)),
      saveSetting('reminder_hours', reminderHours),
    ]);
    toast.success('Notificações salvas!');
  };

  const handleSaveAppointment = async () => {
    await saveSetting('slot_duration', slotDuration);
    toast.success('Configuração de agenda salva!');
  };

  const updateHour = (idx: number, field: keyof WorkingDay, value: string | boolean) => {
    setWorkingHours(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };

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
        await navigator.share({ title: shopName || 'Barbearia — Loja', text: '🔥 Confira os produtos!', url: storeUrl });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(storeUrl);
      toast.success('Link da loja copiado!');
    }
  };

  return (
    <AppLayout>
      <div className="p-4 max-w-lg md:max-w-2xl mx-auto space-y-3 pb-24">
        <h1 className="text-xl font-bold pt-2 text-foreground">Configurações</h1>

        {/* Theme Toggle - always visible */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  {isDark ? <Moon size={20} className="text-primary" /> : <Sun size={20} className="text-primary" />}
                </div>
                <Label className="cursor-pointer text-sm font-semibold text-foreground">
                  Modo {isDark ? 'Escuro' : 'Claro'}
                </Label>
              </div>
              <Switch checked={isDark} onCheckedChange={toggleTheme} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Business Info */}
        <SectionCard
          icon={Building2}
          title="Dados da Barbearia"
          description="Nome, telefone e endereço"
          defaultOpen
        >
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Nome da Barbearia</Label>
              <Input value={shopName} onChange={e => setShopName(e.target.value)} placeholder="Ex: Bruno Barbearia" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Telefone / WhatsApp</Label>
              <Input value={shopPhone} onChange={e => setShopPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Endereço</Label>
              <Input value={shopAddress} onChange={e => setShopAddress(e.target.value)} placeholder="Rua, número - Bairro" />
            </div>
            <Button size="sm" className="w-full gap-2" onClick={handleSaveBusinessInfo}>
              <Save size={14} /> Salvar
            </Button>
          </div>
        </SectionCard>

        {/* Working Hours */}
        <SectionCard
          icon={Clock}
          title="Horários de Funcionamento"
          description="Defina os dias e horários de atendimento"
        >
          <div className="space-y-2">
            {DAYS.map((day, idx) => (
              <div key={day} className="flex items-center gap-2">
                <Switch
                  checked={workingHours[idx].enabled}
                  onCheckedChange={v => updateHour(idx, 'enabled', v)}
                  className="shrink-0"
                />
                <span className={`text-xs w-16 shrink-0 ${workingHours[idx].enabled ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                  {day}
                </span>
                {workingHours[idx].enabled ? (
                  <div className="flex items-center gap-1 flex-1">
                    <Input
                      type="time"
                      value={workingHours[idx].open}
                      onChange={e => updateHour(idx, 'open', e.target.value)}
                      className="h-8 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">—</span>
                    <Input
                      type="time"
                      value={workingHours[idx].close}
                      onChange={e => updateHour(idx, 'close', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Fechado</span>
                )}
              </div>
            ))}
            <Button size="sm" className="w-full gap-2 mt-2" onClick={handleSaveHours}>
              <Save size={14} /> Salvar Horários
            </Button>
          </div>
        </SectionCard>

        {/* Appointment Settings */}
        <SectionCard
          icon={Clock}
          title="Configuração da Agenda"
          description="Duração dos slots de agendamento"
        >
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Duração do Slot (minutos)</Label>
              <Select value={slotDuration} onValueChange={setSlotDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutos</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="45">45 minutos</SelectItem>
                  <SelectItem value="60">60 minutos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="w-full gap-2" onClick={handleSaveAppointment}>
              <Save size={14} /> Salvar
            </Button>
          </div>
        </SectionCard>

        {/* Cashback */}
        <SectionCard
          icon={Percent}
          title="Cashback"
          description="Programa de fidelidade com cashback"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-foreground">Ativar Cashback</Label>
              <Switch checked={cashbackEnabled} onCheckedChange={setCashbackEnabled} />
            </div>
            {cashbackEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3"
              >
                <div>
                  <Label className="text-xs text-muted-foreground">Percentual de Cashback (%)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={cashbackPercent}
                    onChange={e => setCashbackPercent(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Expiração (dias)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={cashbackExpDays}
                    onChange={e => setCashbackExpDays(e.target.value)}
                  />
                </div>
              </motion.div>
            )}
            <Button size="sm" className="w-full gap-2" onClick={handleSaveCashback}>
              <Save size={14} /> Salvar
            </Button>
          </div>
        </SectionCard>

        {/* Notifications */}
        <SectionCard
          icon={Bell}
          title="Notificações WhatsApp"
          description="Mensagens automáticas para clientes"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Confirmação de Atendimento</p>
                <p className="text-[10px] text-muted-foreground">Enviar mensagem ao registrar atendimento</p>
              </div>
              <Switch checked={notifyConfirmation} onCheckedChange={setNotifyConfirmation} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Lembrete de Agendamento</p>
                <p className="text-[10px] text-muted-foreground">Avisar cliente antes do horário</p>
              </div>
              <Switch checked={notifyReminder} onCheckedChange={setNotifyReminder} />
            </div>
            {notifyReminder && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Label className="text-xs text-muted-foreground">Lembrar com antecedência de (horas)</Label>
                <Select value={reminderHours} onValueChange={setReminderHours}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hora antes</SelectItem>
                    <SelectItem value="2">2 horas antes</SelectItem>
                    <SelectItem value="4">4 horas antes</SelectItem>
                    <SelectItem value="24">1 dia antes</SelectItem>
                  </SelectContent>
                </Select>
              </motion.div>
            )}
            <Button size="sm" className="w-full gap-2" onClick={handleSaveNotifications}>
              <Save size={14} /> Salvar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs"
              onClick={() => navigate('/configuracoes/whatsapp')}
            >
              <Smartphone size={14} /> Configurar WhatsApp API
            </Button>
          </div>
        </SectionCard>

        {/* Store Link */}
        <SectionCard
          icon={Store}
          title="Minha Loja Online"
          description="Link e compartilhamento da loja"
        >
          <div className="space-y-3">
            <p className="text-[10px] text-muted-foreground font-mono truncate bg-muted rounded-lg px-3 py-2">
              {storeUrl}
            </p>
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
          </div>
        </SectionCard>

        {/* Export & Maintenance */}
        <SectionCard
          icon={Download}
          title="Dados e Manutenção"
          description="Exportar dados e gerenciar base demo"
        >
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-foreground mb-2">Exportar Dados (CSV)</p>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => handleExport('clients')}>Clientes</Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => handleExport('services')}>Atendimentos</Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => handleExport('plans')}>Planos</Button>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2 text-xs text-muted-foreground"
              size="sm"
              onClick={handleClearReseed}
              disabled={reseeding}
            >
              <RefreshCw size={14} className={reseeding ? 'animate-spin' : ''} />
              {reseeding ? 'Recarregando...' : 'Recarregar Dados Demo'}
            </Button>
          </div>
        </SectionCard>

        {/* Security / Account */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <Shield size={20} className="text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Conta</p>
                  <p className="text-xs text-muted-foreground">Encerrar sessão</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full gap-2 text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5"
                onClick={() => { logout(); navigate('/login'); }}
              >
                <LogOut size={16} /> Sair da Conta
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <p className="text-center text-[10px] text-muted-foreground pt-4 pb-2">
          {shopName || 'Bruno Barbearia'} v1.0.0
        </p>
      </div>
    </AppLayout>
  );
}
