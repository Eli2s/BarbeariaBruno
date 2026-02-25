import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, MessageSquare, Save, CheckCircle, Clock,
  Send, MessageCircle, Bell, Gift, Scissors, CreditCard,
  Settings, Wifi, Info, Link, Unlink, RefreshCw, Loader2,
  ShieldCheck, XCircle, Eye, EyeOff, ChevronDown, ChevronUp,
  ExternalLink, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MessageTemplate, WhatsAppConfig } from '@/types';

// Hooks & API
import {
  useMessageTemplates,
  useUpdateMessageTemplate,
} from '@/hooks/useMessageTemplates';
import { useServices } from '@/hooks/useServices';
import { useClients } from '@/hooks/useClients';
import { getWhatsAppConfig, saveWhatsAppConfig, sendWhatsAppMessage } from '@/lib/whatsappApi';
import {
  initMetaOAuth,
  getOAuthCredentials,
  disconnectOAuth,
  refreshOAuthToken,
  type OAuthCredentials,
} from '@/lib/whatsappOAuth';
import { phoneMask } from '@/lib/format';

const EMPTY_CONFIG: WhatsAppConfig = {
  phoneNumberId: '',
  accessToken: '',
  businessPhone: '',
  shopName: '',
  enabled: false,
};

type ConnectionMode = 'oauth' | 'manual';

export default function MessageTemplatesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Tabs state
  const [activeTab, setActiveTab] = useState('automations');

  // Templates state
  const { data: templates = [] } = useMessageTemplates();
  const updateMutation = useUpdateMessageTemplate();
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  // WhatsApp Config state
  const [oauthCreds, setOauthCreds] = useState<OAuthCredentials | null>(null);
  const [loadingOAuth, setLoadingOAuth] = useState(true);
  const [connectingOAuth, setConnectingOAuth] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshingToken, setRefreshingToken] = useState(false);
  const [config, setConfig] = useState<WhatsAppConfig>(EMPTY_CONFIG);
  const [showToken, setShowToken] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; errorCode?: number } | null>(null);
  const [mode, setMode] = useState<ConnectionMode>('oauth');

  // History data
  const { data: services = [] } = useServices();
  const { data: clients = [] } = useClients();

  // ── Load Data ──────────────────────────────────────────────────────
  useEffect(() => {
    const map: Record<string, string> = {};
    templates.forEach(t => { map[t.type] = t.content; });
    setEditValues(map);
  }, [templates]);

  useEffect(() => {
    setLoadingOAuth(true);
    getOAuthCredentials()
      .then(creds => setOauthCreds(creds))
      .catch(() => setOauthCreds({ connected: false }))
      .finally(() => setLoadingOAuth(false));

    getWhatsAppConfig().then(cfg => {
      if (cfg) setConfig(cfg);
    });
  }, []);

  // ── Handlers (Templates) ───────────────────────────────────────────
  const handleSaveTemplate = async (template: MessageTemplate) => {
    const newContent = editValues[template.type];
    if (newContent !== undefined) {
      try {
        await updateMutation.mutateAsync({ id: template.id!, content: newContent });
        toast.success(`Template "${template.name}" atualizado!`);
      } catch {
        toast.error('Erro ao salvar template');
      }
    }
  };

  // ── Handlers (WhatsApp Config) ──────────────────────────────────────
  const handleConnectOAuth = async () => {
    setConnectingOAuth(true);
    try {
      const { authUrl, state } = await initMetaOAuth();
      sessionStorage.setItem('meta_oauth_state', state);
      const popup = window.open(authUrl, 'meta_oauth', 'width=600,height=700');
      if (!popup) {
        toast.error('Popup bloqueado. Permita popups e tente novamente.');
        setConnectingOAuth(false);
        return;
      }
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type !== 'oauth-complete') return;
        window.removeEventListener('message', messageHandler);
        setConnectingOAuth(false);
        if (event.data.success) {
          toast.success('WhatsApp Business conectado com sucesso!');
          getOAuthCredentials().then(creds => setOauthCreds(creds));
        } else {
          toast.error('Falha ao conectar conta WhatsApp Business.');
        }
      };
      window.addEventListener('message', messageHandler);
    } catch (err: any) {
      toast.error('Erro ao iniciar autenticação', { description: err.message });
      setConnectingOAuth(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Desconectar conta WhatsApp Business?')) return;
    setDisconnecting(true);
    try {
      await disconnectOAuth();
      setOauthCreds({ connected: false });
      toast.success('Conta desconectada.');
    } catch (err: any) {
      toast.error('Erro ao desconectar', { description: err.message });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await saveWhatsAppConfig(config);
      toast.success('Configurações salvas!');
    } catch {
      toast.error('Erro ao salvar configurações.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTest = async () => {
    const testPhone = oauthCreds?.connected ? oauthCreds.displayPhoneNumber : config.businessPhone;
    if (!testPhone?.trim()) { toast.error('Número não disponível.'); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await sendWhatsAppMessage(testPhone, '✅ Teste de conexão — sistema pronto!');
      setTestResult({
        success: result.success,
        message: result.success ? 'Mensagem enviada!' : (result.errorMessage || 'Falha no envio.'),
        errorCode: result.errorCode,
      });
    } finally {
      setTesting(false);
    }
  };

  const isOAuthConnected = oauthCreds?.connected === true;
  const tokenDaysLeft = oauthCreds?.tokenExpiresAt ? differenceInDays(parseISO(oauthCreds.tokenExpiresAt), new Date()) : null;

  // ── Derived Data ────────────────────────────────────────────────────
  const variables = ['{nome}', '{percentual}', '{data_expiracao}', '{dias_restantes}', '{barbearia}'];
  
  const AUTO_MESSAGES = [
    { type: 'thank_you', icon: Scissors, label: '✂️ Confirmação de atendimento', desc: 'Enviada ao registrar novo atendimento', color: 'text-blue-500' },
    { type: 'payment', icon: CreditCard, label: '✅ Confirmação de pagamento', desc: 'Enviada ao confirmar pagamento de plano', color: 'text-green-500' },
    { type: 'cashback_activated', icon: Gift, label: '🎁 Cashback ativado', desc: 'Enviada ao ativar cashback para o cliente', color: 'text-purple-500' },
    { type: 'cashback_reminder', icon: Bell, label: '⏰ Lembrete de cashback', desc: 'Enviada quando cashback está próximo de expirar', color: 'text-amber-500' },
  ];

  const messageHistory = services
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 15)
    .map(svc => {
      const client = clients.find(c => c.id === svc.clientId);
      return {
        id: svc.id,
        clientName: client?.nickname || client?.name || 'Cliente',
        type: 'Atendimento',
        date: svc.date,
      };
    });

  return (
    <AppLayout>
      <div className="p-4 max-w-lg md:max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3 pt-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft size={20} /></Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MessageCircle size={20} className="text-primary" />
              Central de Mensagens
            </h1>
            <p className="text-xs text-muted-foreground">Automações e Conexão WhatsApp</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="automations" className="gap-1.5 text-xs">
              <Send size={13} /> Automáticas
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 text-xs">
              <Settings size={13} /> Configurações
            </TabsTrigger>
          </TabsList>

          {/* ── TAB: AUTOMATICAS ────────────────────────────────────── */}
          <TabsContent value="automations" className="space-y-4 mt-4">
            <div className="space-y-3">
              {AUTO_MESSAGES.map(item => {
                const template = templates.find(t => t.type === item.type);
                return (
                  <Card key={item.type} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-4 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <item.icon size={18} className={item.color} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{item.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <CheckCircle size={14} className={config.enabled ? "text-green-500" : "text-muted-foreground"} />
                          <span className={`text-[10px] font-medium ${config.enabled ? "text-green-600" : "text-muted-foreground"}`}>
                            {config.enabled ? "Ativa" : "Inativa"}
                          </span>
                        </div>
                      </div>
                      
                      {template && (
                        <div className="px-4 pb-4 space-y-3 border-t pt-3 bg-secondary/10">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Conteúdo da mensagem</Label>
                            <div className="flex gap-1">
                              {variables.slice(0, 3).map(v => (
                                <Badge key={v} variant="outline" className="text-[9px] font-mono py-0 h-4">{v}</Badge>
                              ))}
                            </div>
                          </div>
                          <Textarea 
                            className="text-xs min-h-[80px] bg-background"
                            value={editValues[template.type] ?? template.content}
                            onChange={e => setEditValues({ ...editValues, [template.type]: e.target.value })}
                          />
                          <Button variant="outline" className="h-7 text-[10px] gap-1 px-3 ml-auto flex" onClick={() => handleSaveTemplate(template)}>
                            <Save size={12} /> Salvar texto
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Simple history inside the Automations tab to keep things centralized */}
            <Card className="border-dashed border-muted">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-xs font-semibold flex items-center gap-2">
                  <Clock size={13} /> Últimas enviadas
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                {messageHistory.length > 0 ? (
                  <div className="space-y-2">
                    {messageHistory.map(msg => (
                      <div key={msg.id} className="flex items-center justify-between text-[10px] p-1.5 rounded bg-secondary/20">
                        <span className="font-medium">{msg.clientName}</span>
                        <span className="text-muted-foreground">{format(new Date(msg.date), 'dd/MM HH:mm')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground text-center py-2">Nenhuma mensagem recente.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB: CONFIGURAÇÕES (from WhatsAppSettingsPage) ──────── */}
          <TabsContent value="settings" className="space-y-4 mt-4 pb-10">
            {/* Meta OAuth Card */}
            <Card className={isOAuthConnected ? 'border-green-500/40 bg-green-500/5' : ''}>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <ShieldCheck size={16} className="text-primary" />
                    Conectar via Meta
                  </h3>
                  {isOAuthConnected && <Badge className="bg-green-500 text-white border-0 text-[9px]">Conectado</Badge>}
                </div>

                {loadingOAuth ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Verificando...</div>
                ) : isOAuthConnected ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-xs font-medium text-green-700 dark:text-green-400">{oauthCreds?.displayPhoneNumber}</p>
                      <p className="text-[10px] text-muted-foreground">WABA ID: {oauthCreds?.wabaId}</p>
                    </div>
                    <Button variant="outline" size="sm" className="w-full h-8 text-xs text-destructive gap-1.5" onClick={handleDisconnect} disabled={disconnecting}>
                      <Unlink size={14} /> Desconectar conta
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full h-9 gap-2 text-xs" onClick={handleConnectOAuth} disabled={connectingOAuth}>
                    <Link size={14} /> {connectingOAuth ? 'Abrindo Meta...' : 'Conectar com Facebook'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Shop settings */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nome da Barbearia (nas mensagens)</Label>
                  <Input className="h-9 text-xs" value={config.shopName} onChange={e => setConfig({...config, shopName: e.target.value})} placeholder="Bruno Barbearia" />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
                  <div>
                    <Label className="text-xs font-semibold">Envio Automático</Label>
                    <p className="text-[10px] text-muted-foreground">Ativar/Desativar todas as mensagens</p>
                  </div>
                  <Switch checked={config.enabled} onCheckedChange={v => setConfig({...config, enabled: v})} />
                </div>
                <Button className="w-full h-9 gap-2 text-xs" onClick={handleSaveConfig} disabled={savingConfig}>
                  <Save size={14} /> {savingConfig ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </CardContent>
            </Card>

            {/* Manual Toggle */}
            <div className="text-center">
              <Button variant="ghost" size="sm" className="text-[10px] text-muted-foreground" onClick={() => setMode(m => m === 'manual' ? 'oauth' : 'manual')}>
                {mode === 'manual' ? "Ocultar configuração manual" : "Configuração manual (avançado)"}
              </Button>
            </div>

            {mode === 'manual' && (
              <Card className="border-dashed">
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Número WhatsApp Business</Label>
                    <Input className="h-8 text-xs font-mono" value={config.businessPhone} onChange={e => setConfig({...config, businessPhone: phoneMask(e.target.value)})} placeholder="(11) 99999-9999" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone Number ID</Label>
                    <Input className="h-8 text-xs font-mono" value={config.phoneNumberId} onChange={e => setConfig({...config, phoneNumberId: e.target.value.trim()})} placeholder="123456789" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Access Token</Label>
                    <div className="relative">
                      <Input type={showToken ? 'text' : 'password'} className="h-8 text-xs font-mono pr-8" value={config.accessToken} onChange={e => setConfig({...config, accessToken: e.target.value.trim()})} />
                      <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowToken(!showToken)}>
                        {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Test Connection */}
            <Card>
              <CardContent className="p-4 space-y-3">
                 <h3 className="text-xs font-semibold flex items-center gap-2"><Wifi size={14} /> Testar Conexão</h3>
                 <Button variant="outline" size="sm" className="w-full h-8 text-[10px] gap-1.5" onClick={handleTest} disabled={testing}>
                    {testing ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />}
                    Enviar mensagem de teste
                 </Button>
                 {testResult && (
                   <div className={`p-2 rounded text-[10px] border ${testResult.success ? 'bg-green-500/10 border-green-500/20 text-green-600' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
                     {testResult.message}
                   </div>
                 )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
