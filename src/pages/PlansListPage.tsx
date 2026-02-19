import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { formatCurrency } from '@/lib/format';
import { openWhatsApp, generateReminderMessage } from '@/lib/whatsapp';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Plus } from 'lucide-react';
import { format, parseISO, isBefore, addDays } from 'date-fns';

const FILTERS = ['Todos', 'Ativos', 'A vencer', 'Atrasados'] as const;

export default function PlansListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<typeof FILTERS[number]>('Todos');

  const plans = useLiveQuery(() => db.plans.toArray()) ?? [];
  const clients = useLiveQuery(() => db.clients.toArray()) ?? [];
  const clientMap = Object.fromEntries(clients.map(c => [c.id!, c]));

  const now = new Date();
  const filtered = plans.filter(p => {
    if (filter === 'Ativos') return p.status === 'ativo';
    if (filter === 'A vencer') return p.status === 'ativo' && isBefore(parseISO(p.nextCharge), addDays(now, 7)) && !isBefore(parseISO(p.nextCharge), now);
    if (filter === 'Atrasados') return p.status === 'ativo' && isBefore(parseISO(p.nextCharge), now);
    return true;
  });

  const statusColor = (s: string) => s === 'ativo' ? 'default' : 'secondary';

  return (
    <AppLayout>
      <div className="p-4 max-w-lg md:max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-xl font-bold">Planos</h1>
          <Button size="sm" onClick={() => navigate('/planos/novo')} className="gap-1"><Plus size={16} /> Novo</Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map(f => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} className="text-xs whitespace-nowrap">
              {f}
            </Button>
          ))}
        </div>

        <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
          {filtered.map(p => {
            const client = clientMap[p.clientId];
            return (
              <Card key={p.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/planos/editar/${p.id}`)}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{client?.nickname || client?.name || 'Cliente'}</p>
                    <Badge variant={statusColor(p.status)} className="text-[9px]">{p.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs">
                      <span className="font-semibold text-primary">{formatCurrency(p.value)}</span>
                      <span className="text-muted-foreground"> · Próx: {format(parseISO(p.nextCharge), 'dd/MM')}</span>
                    </div>
                    {client && (
                      <Button
                        size="sm" variant="ghost" className="h-7 gap-1"
                        onClick={(e) => { e.stopPropagation(); openWhatsApp(client.whatsapp, generateReminderMessage(client.nickname || client.name, p.name, p.value, format(parseISO(p.nextCharge), 'dd/MM'))); }}
                      >
                        <MessageCircle size={12} />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum plano encontrado</p>}
        </div>
      </div>
    </AppLayout>
  );
}
