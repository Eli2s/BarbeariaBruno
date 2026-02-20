import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, CheckCircle, XCircle, Eye, EyeOff, ExternalLink,
  ChevronDown, ChevronUp, MessageCircle, Save, Info, Wifi,
  AlertTriangle, Link, Unlink, RefreshCw, Loader2, ShieldCheck,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { getWhatsAppConfig, saveWhatsAppConfig, sendWhatsAppMessage } from '@/lib/whatsappApi';
import {
  initMetaOAuth,
  getOAuthCredentials,
  disconnectOAuth,
  refreshOAuthToken,
  type OAuthCredentials,
} from '@/lib/whatsappOAuth';
import type { WhatsAppConfig } from '@/types';
import { phoneMask } from '@/lib/format';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const EMPTY_CONFIG: WhatsAppConfig = {
  phoneNumberId: '',
  accessToken: '',
  businessPhone: '',
  shopName: '',
  enabled: false,
};

type ConnectionMode = 'oauth' | 'manual';

export default function WhatsAppSettingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // OAuth state
  const [oauthCreds, setOauthCreds] = useState<OAuthCredentials | null>(null);
  const [loadingOAuth, setLoadingOAuth] = useState(true);
  const [connectingOAuth, setConnectingOAuth] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshingToken, setRefreshingToken] = useState(false);

  // Manual config state
  const [config, setConfig] = useState<WhatsAppConfig>(EMPTY_CONFIG);
  const [showToken, setShowToken] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; errorCode?: number } | null>(null);

  // Mode toggle
  const [mode, setMode] = useState<ConnectionMode>('oauth');

  // ── Load OAuth credentials on mount ────────────────────────────────
  useEffect(() => {
    setLoadingOAuth(true);
    getOAuthCredentials()
      .then(creds => setOauthCreds(creds))
      .catch(() => setOauthCreds({ connected: false }))
      .finally(() => setLoadingOAuth(false));
  }, []);

  // ── Load manual config ──────────────────────────────────────────────
  useEffect(() => {
    getWhatsAppConfig().then(cfg => {
      if (cfg) setConfig(cfg);
    });
  }, []);

  // ── Handle OAuth redirect result ────────────────────────────────────
  useEffect(() => {
    const oauthResult = searchParams.get('oauth');
    if (oauthResult === 'success') {
      toast.success('WhatsApp Business conectado com sucesso!');
      // Reload credentials
      getOAuthCredentials().then(creds => setOauthCreds(creds));
    } else if (oauthResult === 'error') {
      toast.error('Falha ao conectar conta WhatsApp Business. Tente novamente.');
    }
  }, [searchParams]);

  // ── Derived state ───────────────────────────────────────────────────
  const isOAuthConnected = oauthCreds?.connected === true;

  const tokenDaysLeft = (() => {
    if (!oauthCreds?.tokenExpiresAt) return null;
    try {
      return differenceInDays(parseISO(oauthCreds.tokenExpiresAt), new Date());
    } catch {
      return null;
    }
  })();

  const tokenWarning = tokenDaysLeft !== null && tokenDaysLeft <= 30;

  // ── Handlers ────────────────────────────────────────────────────────
  const handleConnectOAuth = async () => {
    setConnectingOAuth(true);
    try {
      const { authUrl, state } = await initMetaOAuth();
      // Save state in sessionStorage for CSRF validation
      sessionStorage.setItem('meta_oauth_state', state);
      // Redirect to Meta login
      window.location.href = authUrl;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao iniciar autenticação', { description: message });
      setConnectingOAuth(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar a conta WhatsApp Business?')) return;
    setDisconnecting(true);
    try {
      await disconnectOAuth();
      setOauthCreds({ connected: false });
      toast.success('Conta desconectada.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao desconectar', { description: message });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleRefreshToken = async () => {
    setRefreshingToken(true);
    try {
      const result = await refreshOAuthToken();
      if (result.success) {
        toast.success('Token renovado com sucesso!');
        const creds = await getOAuthCredentials();
        setOauthCreds(creds);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao renovar token', { description: message });
    } finally {
      setRefreshingToken(false);
    }
  };

  const handleSave = async () => {
    if (config.enabled && (!config.phoneNumberId.trim() || !config.accessToken.trim())) {
      toast.error('Preencha o Phone Number ID e o Access Token para ativar o envio.');
      return;
    }
    setSaving(true);
    try {
      await saveWhatsAppConfig(config);
      toast.success('Configurações salvas!');
    } catch {
      toast.error('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    const testPhone = isOAuthConnected && oauthCreds?.displayPhoneNumber
      ? oauthCreds.displayPhoneNumber
      : config.businessPhone;

    if (!testPhone?.trim()) {
      toast.error('Número de negócio não disponível para teste.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await sendWhatsAppMessage(
        testPhone,
        '✅ Teste de conexão BrunoFlow — integração funcionando!'
      );
      setTestResult({
        success: result.success,
        message: result.success
          ? 'Mensagem enviada com sucesso!'
          : (result.errorMessage || 'Falha ao enviar mensagem.'),
        errorCode: result.errorCode,
      });
    } finally {
      setTesting(false);
    }
  };

  const set = (field: keyof WhatsAppConfig, value: string | boolean) =>
    setConfig(prev => ({ ...prev, [field]: value }));

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="p-4 max-w-lg mx-auto space-y-5 pb-10">

        {/* Header */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MessageCircle size={20} className="text-green-500" />
              WhatsApp Automático
            </h1>
            <p className="text-xs text-muted-foreground">Meta Cloud API (gratuito até 1.000 msgs/mês)</p>
          </div>
        </div>

        {/* ── OAuth CONNECTION CARD ─────────────────────────────────── */}
        <Card className={isOAuthConnected ? 'border-green-500/40 bg-green-500/5' : 'border-muted'}>
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary" />
              Conectar via Meta (Recomendado)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {loadingOAuth ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 size={16} className="animate-spin" />
                Verificando status...
              </div>
            ) : isOAuthConnected ? (
              <>
                {/* Connected State */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle size={20} className="text-green-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">Conta conectada</p>
                    {oauthCreds?.displayPhoneNumber && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Número: <span className="font-mono font-medium">{oauthCreds.displayPhoneNumber}</span>
                      </p>
                    )}
                    {oauthCreds?.wabaId && (
                      <p className="text-xs text-muted-foreground">
                        WABA ID: <span className="font-mono">{oauthCreds.wabaId}</span>
                      </p>
                    )}
                    {oauthCreds?.connectedAt && (
                      <p className="text-xs text-muted-foreground">
                        Conectado em: {format(parseISO(oauthCreds.connectedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                  <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 shrink-0">Ativo</Badge>
                </div>

                {/* Token expiry warning */}
                {tokenDaysLeft !== null && (
                  <div className={`flex items-center gap-2 p-2.5 rounded-lg text-xs border ${
                    tokenWarning
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                      : 'bg-secondary/40 border-transparent text-muted-foreground'
                  }`}>
                    <Clock size={13} className="shrink-0" />
                    <span>
                      Token expira em <strong>{tokenDaysLeft} dias</strong>
                      {oauthCreds?.tokenExpiresAt && (
                        <> ({format(parseISO(oauthCreds.tokenExpiresAt), 'dd/MM/yyyy')})</>
                      )}
                    </span>
                    {tokenWarning && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto h-6 text-xs px-2 gap-1 border-amber-500/30"
                        onClick={handleRefreshToken}
                        disabled={refreshingToken}
                      >
                        {refreshingToken
                          ? <Loader2 size={11} className="animate-spin" />
                          : <RefreshCw size={11} />
                        }
                        Renovar
                      </Button>
                    )}
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? <Loader2 size={15} className="animate-spin" /> : <Unlink size={15} />}
                  {disconnecting ? 'Desconectando...' : 'Desconectar conta'}
                </Button>
              </>
            ) : (
              <>
                {/* Not connected state */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/40">
                  <XCircle size={20} className="text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Conta não conectada</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Conecte sua conta WhatsApp Business via Meta para enviar mensagens automaticamente aos clientes.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">O que acontece ao conectar:</p>
                  {[
                    'Você será redirecionado para o login da Meta (Facebook)',
                    'Aceite as permissões de WhatsApp Business',
                    'Suas credenciais são salvas com segurança no servidor',
                    'Mensagens automáticas passam a funcionar imediatamente',
                  ].map(step => (
                    <div key={step} className="flex items-start gap-1.5">
                      <CheckCircle size={12} className="text-green-500 mt-0.5 shrink-0" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={handleConnectOAuth}
                  disabled={connectingOAuth}
                >
                  {connectingOAuth
                    ? <Loader2 size={15} className="animate-spin" />
                    : <Link size={15} />
                  }
                  {connectingOAuth ? 'Abrindo Meta...' : 'Conectar com Meta (Facebook)'}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Requer um app criado em{' '}
                  <a
                    href="https://developers.facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    developers.facebook.com
                  </a>{' '}
                  com WhatsApp Business configurado.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── SHOP NAME (shared) ────────────────────────────────────── */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">Nome da Barbearia</h2>
            <div className="space-y-1.5">
              <Input
                value={config.shopName}
                onChange={e => set('shopName', e.target.value)}
                placeholder="Bruno Barbearia"
              />
              <p className="text-xs text-muted-foreground">Aparece nas mensagens enviadas ao cliente</p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/40">
              <div>
                <Label className="cursor-pointer font-medium">Ativar envio automático</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Envia mensagem após atendimento e pagamento</p>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={v => set('enabled', v)}
              />
            </div>
            <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
              <Save size={16} />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </CardContent>
        </Card>

        {/* ── MANUAL CONFIG (advanced / fallback) ──────────────────── */}
        <Card className="border-dashed">
          <button
            type="button"
            className="w-full p-4 flex items-center justify-between text-left"
            onClick={() => setMode(m => m === 'manual' ? 'oauth' : 'manual')}
          >
            <div className="flex items-center gap-2">
              <Info size={15} className="text-muted-foreground" />
              <span className="text-sm font-medium">Configuração manual (avançado)</span>
            </div>
            {mode === 'manual'
              ? <ChevronUp size={16} className="text-muted-foreground" />
              : <ChevronDown size={16} className="text-muted-foreground" />
            }
          </button>

          {mode === 'manual' && (
            <div className="px-4 pb-4 space-y-4 border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Use esta seção apenas se o fluxo OAuth não estiver disponível. As credenciais manuais são salvas apenas neste dispositivo (IndexedDB).
              </p>

              {/* Business phone */}
              <div className="space-y-1.5">
                <Label>Número WhatsApp Business</Label>
                <Input
                  value={config.businessPhone}
                  onChange={e => set('businessPhone', phoneMask(e.target.value))}
                  placeholder="(11) 99999-9999"
                />
              </div>

              {/* Phone Number ID */}
              <div className="space-y-1.5">
                <Label>Phone Number ID <span className="text-destructive">*</span></Label>
                <Input
                  value={config.phoneNumberId}
                  onChange={e => set('phoneNumberId', e.target.value.trim())}
                  placeholder="123456789012345"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">Meta for Developers → seu app → WhatsApp → API Setup</p>
              </div>

              {/* Access Token */}
              <div className="space-y-1.5">
                <Label>Access Token <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    type={showToken ? 'text' : 'password'}
                    value={config.accessToken}
                    onChange={e => set('accessToken', e.target.value.trim())}
                    placeholder="EAAxxxxxxxxxxxxxxx"
                    className="font-mono pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowToken(v => !v)}
                  >
                    {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Salvo apenas localmente neste dispositivo.</p>
              </div>

              <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
                <Save size={16} />
                {saving ? 'Salvando...' : 'Salvar Credenciais Manuais'}
              </Button>
            </div>
          )}
        </Card>

        {/* ── TEST CONNECTION ───────────────────────────────────────── */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Wifi size={14} />
              Testar Conexão
            </h2>
            <p className="text-xs text-muted-foreground">
              Envia uma mensagem de teste para o número de negócio configurado.
            </p>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleTest}
              disabled={testing}
            >
              <Wifi size={15} />
              {testing ? 'Enviando mensagem de teste...' : 'Testar Conexão'}
            </Button>

            {testResult && (
              <div className={`p-3 rounded-lg border text-sm flex flex-col gap-1 ${
                testResult.success
                  ? 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400'
                  : 'border-destructive/40 bg-destructive/10 text-destructive'
              }`}>
                <p className="font-semibold">
                  {testResult.success ? '✅ Conexão funcionando!' : '❌ Falha no envio'}
                </p>
                <p className="text-xs">{testResult.message}</p>
                {!testResult.success && testResult.errorCode === 131030 && (
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <a
                      href="https://developers.facebook.com/apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline flex items-center gap-1"
                    >
                      <ExternalLink size={11} /> Abrir lista de destinatários
                    </a>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── META DEV MODE WARNING ─────────────────────────────────── */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-500 shrink-0" />
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Modo de Desenvolvimento da Meta</p>
            </div>
            <p className="text-xs text-muted-foreground">
              No modo de teste, mensagens só podem ser enviadas para números cadastrados manualmente no painel da Meta. Para enviar para qualquer cliente, publique seu app e solicite a permissão <strong>whatsapp_business_messaging</strong>.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs border-amber-500/30 text-amber-700 dark:text-amber-400"
                onClick={() => window.open('https://developers.facebook.com/apps', '_blank')}
              >
                <ExternalLink size={12} /> Abrir lista de destinatários
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs border-amber-500/30 text-amber-700 dark:text-amber-400"
                onClick={() => window.open('https://developers.facebook.com/docs/whatsapp/overview/get-started', '_blank')}
              >
                <ExternalLink size={12} /> Ver como publicar app
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── HOW TO GET CREDENTIALS ────────────────────────────────── */}
        <Card className="border-blue-500/20 bg-blue-500/5">
          <button
            type="button"
            className="w-full p-4 flex items-center justify-between text-left"
            onClick={() => setShowGuide(v => !v)}
          >
            <div className="flex items-center gap-2">
              <Info size={16} className="text-blue-500" />
              <span className="text-sm font-semibold">Como preparar o app na Meta?</span>
            </div>
            {showGuide ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
          </button>

          {showGuide && (
            <div className="px-4 pb-4 space-y-3 text-xs text-muted-foreground border-t pt-3">
              <ol className="space-y-2 list-decimal list-inside">
                <li>Acesse <strong>developers.facebook.com</strong> e crie um app do tipo <em>Business</em></li>
                <li>Adicione o produto <strong>WhatsApp</strong> ao seu app</li>
                <li>Em <strong>Configurações → OAuth do Facebook</strong>, adicione como URI de redirecionamento válido: <span className="font-mono bg-muted px-1 rounded">{window.location.origin}/whatsapp-oauth-callback</span></li>
                <li>Clique em <strong>"Conectar com Meta"</strong> acima e faça login</li>
                <li>Aceite as permissões de WhatsApp Business</li>
              </ol>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                <strong>Tier gratuito:</strong> Até 1.000 conversas de negócios por mês sem custo.
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-blue-600 dark:text-blue-400 border-blue-500/30"
                onClick={() => window.open('https://developers.facebook.com/docs/whatsapp/cloud-api/get-started', '_blank')}
              >
                <ExternalLink size={14} />
                Abrir documentação oficial
              </Button>
            </div>
          )}
        </Card>

        {/* ── AUTOMATED MESSAGES ────────────────────────────────────── */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <MessageCircle size={14} />
              Mensagens automáticas enviadas
            </h2>
            <div className="space-y-2">
              {[
                { label: '✂️ Confirmação de atendimento', desc: 'Enviada ao registrar novo atendimento' },
                { label: '✅ Confirmação de pagamento', desc: 'Enviada ao confirmar pagamento de plano' },
                { label: '🎁 Cashback ativado', desc: 'Enviada ao ativar cashback para o cliente' },
                { label: '⏰ Lembrete de cashback', desc: 'Enviada quando cashback está próximo de expirar' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-2 p-2 rounded-lg bg-secondary/30">
                  <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
