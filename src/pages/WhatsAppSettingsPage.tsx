import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, XCircle, Eye, EyeOff, ExternalLink, ChevronDown, ChevronUp, MessageCircle, Save, Info } from 'lucide-react';
import { toast } from 'sonner';
import { getWhatsAppConfig, saveWhatsAppConfig } from '@/lib/whatsappApi';
import type { WhatsAppConfig } from '@/types';
import { phoneMask } from '@/lib/format';

const EMPTY_CONFIG: WhatsAppConfig = {
  phoneNumberId: '',
  accessToken: '',
  businessPhone: '',
  shopName: '',
  enabled: false,
};

export default function WhatsAppSettingsPage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<WhatsAppConfig>(EMPTY_CONFIG);
  const [isConfigured, setIsConfigured] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getWhatsAppConfig().then(cfg => {
      if (cfg) {
        setConfig(cfg);
        setIsConfigured(!!(cfg.phoneNumberId && cfg.accessToken && cfg.enabled));
      }
    });
  }, []);

  const handleSave = async () => {
    if (config.enabled && (!config.phoneNumberId.trim() || !config.accessToken.trim())) {
      toast.error('Preencha o Phone Number ID e o Access Token para ativar o envio.');
      return;
    }
    setSaving(true);
    try {
      await saveWhatsAppConfig(config);
      const ok = !!(config.phoneNumberId && config.accessToken && config.enabled);
      setIsConfigured(ok);
      toast.success('Configurações salvas!');
    } catch {
      toast.error('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const set = (field: keyof WhatsAppConfig, value: string | boolean) =>
    setConfig(prev => ({ ...prev, [field]: value }));

  return (
    <AppLayout>
      <div className="p-4 max-w-lg mx-auto space-y-5">
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

        {/* Status Badge */}
        <Card className={isConfigured ? 'border-green-500/40 bg-green-500/5' : 'border-muted'}>
          <CardContent className="p-4 flex items-center gap-3">
            {isConfigured ? (
              <>
                <CheckCircle size={22} className="text-green-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">Integração ativa</p>
                  <p className="text-xs text-muted-foreground">Mensagens serão enviadas automaticamente ao cliente</p>
                </div>
                <Badge className="ml-auto bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">Ativo</Badge>
              </>
            ) : (
              <>
                <XCircle size={22} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Integração inativa</p>
                  <p className="text-xs text-muted-foreground">Configure as credenciais abaixo para ativar</p>
                </div>
                <Badge variant="secondary" className="ml-auto">Inativo</Badge>
              </>
            )}
          </CardContent>
        </Card>

        {/* Config Form */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <h2 className="text-sm font-semibold">Configurações da API</h2>

            {/* Enable toggle */}
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

            {/* Shop name */}
            <div className="space-y-1.5">
              <Label>Nome da Barbearia</Label>
              <Input
                value={config.shopName}
                onChange={e => set('shopName', e.target.value)}
                placeholder="Bruno Barbearia"
              />
              <p className="text-xs text-muted-foreground">Aparece nas mensagens enviadas ao cliente</p>
            </div>

            {/* Business phone */}
            <div className="space-y-1.5">
              <Label>Número WhatsApp Business</Label>
              <Input
                value={config.businessPhone}
                onChange={e => set('businessPhone', phoneMask(e.target.value))}
                placeholder="(11) 99999-9999"
              />
              <p className="text-xs text-muted-foreground">Seu número cadastrado na Meta (apenas para exibição)</p>
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
              <p className="text-xs text-muted-foreground">Encontrado em Meta for Developers → seu app → WhatsApp → API Setup</p>
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
              <p className="text-xs text-muted-foreground">Token permanente gerado no painel da Meta. Salvo apenas localmente neste dispositivo.</p>
            </div>

            <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
              <Save size={16} />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </CardContent>
        </Card>

        {/* How to get credentials — collapsible guide */}
        <Card className="border-blue-500/20 bg-blue-500/5">
          <button
            type="button"
            className="w-full p-4 flex items-center justify-between text-left"
            onClick={() => setShowGuide(v => !v)}
          >
            <div className="flex items-center gap-2">
              <Info size={16} className="text-blue-500" />
              <span className="text-sm font-semibold">Como obter as credenciais?</span>
            </div>
            {showGuide ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
          </button>

          {showGuide && (
            <div className="px-4 pb-4 space-y-3 text-xs text-muted-foreground border-t pt-3">
              <ol className="space-y-2 list-decimal list-inside">
                <li>Acesse <strong>developers.facebook.com</strong> e crie um app do tipo <em>Business</em></li>
                <li>Adicione o produto <strong>WhatsApp</strong> ao seu app</li>
                <li>Na seção <strong>API Setup</strong>, copie o <strong>Phone Number ID</strong></li>
                <li>Gere um <strong>Token permanente</strong> via System User no Business Manager</li>
                <li>Cole as credenciais nos campos acima e ative o envio</li>
              </ol>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                <strong>Tier gratuito:</strong> Até 1.000 conversas de negócios por mês sem custo. Ideal para barbearias pequenas.
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

        {/* Messages that will be sent */}
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
