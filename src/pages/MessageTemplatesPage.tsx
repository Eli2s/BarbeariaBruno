import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageSquare, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { MessageTemplate } from '@/types';

import {
  useMessageTemplates,
  useCreateMessageTemplatesBulk,
  useUpdateMessageTemplate,
} from '@/hooks/useMessageTemplates';

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

export default function MessageTemplatesPage() {
  const navigate = useNavigate();
  const { data: templates = [] } = useMessageTemplates();
  const createBulkMutation = useCreateMessageTemplatesBulk();
  const updateMutation = useUpdateMessageTemplate();
  const [editValues, setEditValues] = useState<Record<string, string>>({});

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

  const variables = ['{nome}', '{percentual}', '{data_expiracao}', '{dias_restantes}'];

  return (
    <AppLayout>
      <div className="p-4 max-w-lg md:max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3 pt-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft size={20} /></Button>
          <div>
            <h1 className="text-xl font-bold">Mensagens WhatsApp</h1>
            <p className="text-xs text-muted-foreground">Edite os templates de mensagens automáticas</p>
          </div>
        </div>

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
      </div>
    </AppLayout>
  );
}
