import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Save, Send, Settings, QrCode, RefreshCw, MessageCircle, AlertTriangle, ShieldCheck, Loader2, LogOut
} from 'lucide-react';
import { toast } from 'sonner';
import type { MessageTemplate } from '@/types';

// Hooks & API
import {
  useMessageTemplates,
  useUpdateMessageTemplate,
} from '@/hooks/useMessageTemplates';
import { apiGet, apiDelete } from '@/api/apiClient';

export default function MessageTemplatesPage() {
  const navigate = useNavigate();
  
  // Tabs state
  const [activeTab, setActiveTab] = useState('status');

  // Templates state
  const { data: templates = [] } = useMessageTemplates();
  const updateMutation = useUpdateMessageTemplate();
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  // WhatsApp Config state
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // ── Load Data ──────────────────────────────────────────────────────
  useEffect(() => {
    const map: Record<string, string> = {};
    templates.forEach(t => { map[t.type] = t.content; });
    setEditValues(map);
  }, [templates]);

  const loadWhatsAppStatus = async () => {
    setLoadingStatus(true);
    setQrCodeBase64(null);
    try {
      const response = await apiGet<any>('/admin/whatsapp/qrcode');
      
      if (response?.status === 'CONNECTED') {
        setConnectionStatus('CONNECTED');
      } else if (response?.base64) {
        setQrCodeBase64(response.base64);
        setConnectionStatus('DISCONNECTED');
      } else {
        // Desconectado sem QR code — pode ser que a instância precise ser criada
        setConnectionStatus('DISCONNECTED');
      }
    } catch (error: any) {
      console.error(error);
      setConnectionStatus('ERROR');
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar o WhatsApp?')) return;
    setIsDisconnecting(true);
    try {
      await apiDelete('/admin/whatsapp/delete-instance');
      toast.success('WhatsApp desconectado com sucesso.');
      loadWhatsAppStatus();
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao desconectar o WhatsApp.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  useEffect(() => {
    loadWhatsAppStatus();
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

  // ── Derived Data ────────────────────────────────────────────────────
  const variables = ['{nome}', '{barbearia}', '{servicos}', '{valor}', '{data}', '{proxima_data}', '{dias_restantes}', '{percentual}'];
  
  const AUTO_MESSAGES = [
    { type: 'thank_you', label: '✂️ Confirmação de atendimento', desc: 'Enviada ao registrar novo atendimento', color: 'text-blue-500' },
    { type: 'payment', label: '✅ Confirmação de pagamento', desc: 'Enviada ao confirmar pagamento de plano', color: 'text-green-500' },
    { type: 'cashback_activated', label: '🎁 Cashback ativado', desc: 'Enviada ao ativar cashback para o cliente', color: 'text-purple-500' },
    { type: 'cashback_reminder', label: '⏰ Lembrete de cashback', desc: 'Enviada quando cashback está próximo de expirar', color: 'text-amber-500' },
  ];

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
            <p className="text-xs text-muted-foreground">Conecte seu WhatsApp e configure mensagens automáticas</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="status" className="gap-1.5 text-xs">
              <Settings size={13} /> Conexão WhatsApp
            </TabsTrigger>
            <TabsTrigger value="automations" className="gap-1.5 text-xs">
              <Send size={13} /> Mensagens Automáticas
            </TabsTrigger>
          </TabsList>

          {/* ── TAB: CONEXÃO WHATSAPP ────────────────────────────────────── */}
          <TabsContent value="status" className="space-y-4 mt-4">
             <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex flex-row items-center gap-2">
                    <ShieldCheck size={20} className="text-green-500" /> WhatsApp WhatsMiau
                  </CardTitle>
                  <CardDescription>
                    Conecte o seu número de WhatsApp da Barbearia gerando o QR Code abaixo. Deixe a API conectada para que o envio das mensagens seja automatizado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center space-y-6 py-6">
                  
                  {loadingStatus ? (
                    <div className="text-center space-y-2">
                      <Loader2 size={32} className="animate-spin text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">Verificando status de conexão...</p>
                    </div>
                  ) : connectionStatus === 'CONNECTED' ? (
                     <div className="text-center space-y-4">
                        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                           <MessageCircle size={32} className="text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-green-700 text-lg">WhatsApp Conectado!</p>
                          <p className="text-xs text-muted-foreground">Sua API já está pronta para disparar mensagens.</p>
                        </div>
                        <div className="pt-2">
                           <Button onClick={handleDisconnect} disabled={isDisconnecting} variant="destructive" className="gap-2">
                             {isDisconnecting ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                             Desconectar WhatsApp
                           </Button>
                        </div>
                     </div>
                  ) : qrCodeBase64 ? (
                     <div className="text-center space-y-4 flex flex-col items-center">
                        <div className="p-2 border rounded-xl bg-white">
                           <img src={qrCodeBase64} alt="WhatsApp QR Code" className="w-[250px] h-[250px] object-contain" />
                        </div>
                        <p className="text-sm font-medium">Abra o WhatsApp no seu celular e escaneie o código acima.</p>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">Aparelhos conectados {'>'} Conectar um aparelho</p>
                     </div>
                  ) : (
                     <div className="text-center space-y-4">
                        <AlertTriangle size={32} className="text-amber-500 mx-auto" />
                        <p className="text-sm text-muted-foreground">Nenhuma instância iniciada ou erro ao carregar.</p>
                     </div>
                  )}

                  <div className="pt-4 w-full">
                     <Button onClick={loadWhatsAppStatus} disabled={loadingStatus} className="w-full gap-2" variant="outline">
                       <RefreshCw size={16} className={loadingStatus ? "animate-spin" : ""} />
                       Atualizar Status
                     </Button>
                  </div>

                </CardContent>
             </Card>
          </TabsContent>

          {/* ── TAB: AUTOMATICAS ────────────────────────────────────── */}
          <TabsContent value="automations" className="space-y-4 mt-4">
            <div className="space-y-4">
              {AUTO_MESSAGES.map(item => {
                const template = templates.find(t => t.type === item.type);
                return (
                  <Card key={item.type} className="overflow-hidden">
                    <CardHeader className="py-3 px-4 bg-secondary/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-background flex items-center justify-center shrink-0 shadow-sm border">
                          <MessageCircle size={16} className={item.color} />
                        </div>
                        <div>
                          <CardTitle className="text-sm">{item.label}</CardTitle>
                          <CardDescription className="text-xs">{item.desc}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      {template ? (
                        <>
                          <div className="flex flex-wrap gap-1 mb-2">
                             {variables.map(v => (
                               <Badge key={v} variant="outline" className="text-[10px] font-mono cursor-default bg-muted/50 hover:bg-muted">{v}</Badge>
                             ))}
                          </div>
                          <Textarea 
                            className="text-sm min-h-[100px] whitespace-pre-wrap leading-relaxed"
                            value={editValues[template.type] ?? template.content}
                            onChange={e => setEditValues({ ...editValues, [template.type]: e.target.value })}
                            placeholder="Digite o texto da mensagem aqui..."
                          />
                          <div className="flex justify-end">
                            <Button size="sm" className="gap-2" onClick={() => handleSaveTemplate(template)}>
                              <Save size={14} /> Salvar Texto
                            </Button>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground py-2 italic text-center">Falta o registro no banco para este template. Adicione as seeds.</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
