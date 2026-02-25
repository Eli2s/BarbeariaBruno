import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, MessageSquare, Save, CheckCircle, Clock,
  Send, MessageCircle, Bell, Gift, Scissors, CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import type { MessageTemplate } from '@/types';

import {
  useMessageTemplates,
  useCreateMessageTemplatesBulk,
  useUpdateMessageTemplate,
} from '@/hooks/useMessageTemplates';
import { useServices } from '@/hooks/useServices';
import { useClients } from '@/hooks/useClients';

// ── Default templates ─────────────────────────────────────────────────
const DEFAULT_TEMPLATES: Omit<MessageTemplate, 'id'>[] = [
  {
    type: 'cashback_activated',
    name: 'Cashback Ativado',
    content: 'Obrigado pela visita, {nome}! 🎉\n\nVocê ganhou *{percentual}% de desconto* no próximo serviço, válido até {data_expiracao}.\n\nVolte logo! 💈✂️',
  },
  {
    type: 'cashback_reminder',
    name: 'Lembrete de Cashback',
    content: 'Oi {nome}! 👋\n\nFaltam apenas *{dias_restantes} dias* para seu cashback de *{percentual}%* expirar!\n\nAgende seu próximo corte e aproveite o desconto. 💈',
  },
  {
    type: 'thank_you',
    name: 'Agradecimento',
    content: 'Obrigado pela preferência, {nome}! 🙏\n\nFoi um prazer atendê-lo. Até a próxima! ✂️💈',
  },
];

// ── Automated message types ───────────────────────────────────────────
const AUTO_MESSAGES = [
  {
    icon: Scissors,
    label: '✂️ Confirmação de atendimento',
    desc: 'Enviada automaticamente ao registrar um novo atendimento',
    color: 'text-blue-500',
  },
  {
    icon: CreditCard,
    label: '✅ Confirmação de pagamento',
    desc: 'Enviada ao confirmar pagamento de plano',
    color: 'text-green-500',
  },
  {
    icon: Gift,
    label: '🎁 Cashback ativado',
    desc: 'Enviada ao ativar cashback para o cliente',
    color: 'text-purple-500',
  },
  {
    icon: Bell,
    label: '⏰ Lembrete de cashback',
    desc: 'Enviada quando cashback está próximo de expirar',
    color: 'text-amber-500',
  },
];

export default function MessageTemplatesPage() {
  const navigate = useNavigate();
  const { data: templates = [] } = useMessageTemplates();
  const createBulkMutation = useCreateMessageTemplatesBulk();
  const updateMutation = useUpdateMessageTemplate();
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  // Data for history
  const { data: services = [] } = useServices();
  const { data: clients = [] } = useClients();

  // Seed default templates if none exist
  useEffect(() => {
    if (templates.length === 0) {
      createBulkMutation.mutateAsync(DEFAULT_TEMPLATES).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates.length]);

  useEffect(() => {
    const map: Record<string, string> = {};
    templates.forEach(t => { map[t.type] = t.content; });
    setEditValues(map);
  }, [templates]);

  const handleSave = async (template: MessageTemplate) => {
    const newContent = editValues[template.type];
    if (newContent !== undefined) {
      try {
        await updateMutation.mutateAsync({ id: template.id!, content: newContent });
        toast.success(`Template "${template.name}" salvo!`);
      } catch {
        toast.error('Erro ao salvar template');
      }
    }
  };

  const variables = ['{nome}', '{percentual}', '{data_expiracao}', '{dias_restantes}', '{barbearia}'];

  // Build simple message history from services (approximation)
  const messageHistory = services
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30)
    .map(svc => {
      const client = clients.find(c => c.id === svc.clientId);
      return {
        id: svc.id,
        clientName: client?.nickname || client?.name || 'Cliente',
        clientWhatsapp: client?.whatsapp || '',
        type: 'Confirmação de atendimento',
        date: svc.date,
        icon: Scissors,
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
              Mensagens
            </h1>
            <p className="text-xs text-muted-foreground">Templates, automações e histórico</p>
          </div>
        </div>

        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates" className="gap-1.5 text-xs">
              <MessageSquare size={13} /> Templates
            </TabsTrigger>
            <TabsTrigger value="automations" className="gap-1.5 text-xs">
              <Send size={13} /> Automáticas
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs">
              <Clock size={13} /> Histórico
            </TabsTrigger>
          </TabsList>

          {/* ── TAB: Templates ──────────────────────────────────────── */}
          <TabsContent value="templates" className="space-y-4 mt-4">
            <Card className="bg-secondary/30">
              <CardContent className="p-3">
                <p className="text-xs font-medium mb-1.5">Variáveis disponíveis:</p>
                <div className="flex flex-wrap gap-1.5">
                  {variables.map(v => (
                    <Badge key={v} variant="outline" className="text-[10px] font-mono">{v}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {templates.map(t => (
              <Card key={t.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-primary" />
                    <Label className="text-sm font-semibold">{t.name}</Label>
                    <Badge variant="outline" className="text-[10px] ml-auto">{t.type}</Badge>
                  </div>
                  <Textarea
                    rows={5}
                    value={editValues[t.type] ?? t.content}
                    onChange={e => setEditValues({ ...editValues, [t.type]: e.target.value })}
                    className="text-xs"
                  />
                  <Button size="sm" className="gap-1.5" onClick={() => handleSave(t)}>
                    <Save size={12} /> Salvar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── TAB: Mensagens Automáticas ──────────────────────────── */}
          <TabsContent value="automations" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Send size={14} className="text-primary" />
                  Mensagens automáticas configuradas
                </h2>
                <p className="text-xs text-muted-foreground">
                  Estas mensagens são enviadas automaticamente via WhatsApp quando determinadas ações ocorrem no sistema.
                </p>
                <div className="space-y-2">
                  {AUTO_MESSAGES.map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <item.icon size={14} className={item.color} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <CheckCircle size={14} className="text-green-500" />
                        <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">Ativa</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Para configurar a conexão com o WhatsApp (Meta Cloud API), acesse as{' '}
                  <button
                    type="button"
                    className="text-primary underline font-medium"
                    onClick={() => navigate('/whatsapp-config')}
                  >
                    Configurações do WhatsApp
                  </button>.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB: Histórico ─────────────────────────────────────── */}
          <TabsContent value="history" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Clock size={14} className="text-primary" />
                  Histórico de mensagens enviadas
                </h2>
                <p className="text-xs text-muted-foreground">
                  Últimas mensagens enviadas automaticamente aos clientes (com base nos atendimentos registrados).
                </p>

                {messageHistory.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {messageHistory.map(msg => (
                      <div key={msg.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 border border-border/50">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                          <msg.icon size={14} className="text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{msg.clientName}</p>
                          <p className="text-[10px] text-muted-foreground">{msg.type}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(msg.date), 'dd/MM/yy')}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(msg.date), 'HH:mm')}
                          </p>
                        </div>
                        <CheckCircle size={12} className="text-green-500 shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare size={24} className="mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma mensagem enviada ainda</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      As mensagens aparecerão aqui após registrar atendimentos
                    </p>
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
