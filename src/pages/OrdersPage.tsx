import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Package } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { format, parseISO } from 'date-fns';

export default function OrdersPage() {
  const orders = useLiveQuery(() => db.orders.reverse().toArray()) ?? [];

  const updateStatus = async (id: number, status: 'pago' | 'cancelado') => {
    await db.orders.update(id, { status });
    toast.success(`Pedido ${status === 'pago' ? 'marcado como pago' : 'cancelado'}!`);
  };

  const statusColor = (s: string) => {
    if (s === 'pago') return 'bg-green-500/10 text-green-500 border-green-500/30';
    if (s === 'cancelado') return 'bg-red-500/10 text-red-500 border-red-500/30';
    return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
  };

  const paymentLabel = (m: string) => {
    if (m === 'cartao') return 'Cartão';
    if (m === 'pix') return 'Pix';
    return 'Link WhatsApp';
  };

  return (
    <AppLayout>
      <div className="p-4 max-w-lg md:max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-2 pt-2">
          <ShoppingBag size={20} className="text-primary" />
          <h1 className="text-xl font-bold">Pedidos da Loja</h1>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum pedido realizado ainda</p>
          </div>
        )}

        <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
          {orders.map(o => (
            <Card key={o.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{o.customerName}</p>
                    <p className="text-xs text-muted-foreground">{o.customerWhatsapp}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{formatCurrency(o.totalValue)}</p>
                    <Badge variant="outline" className={`text-[9px] ${statusColor(o.status)}`}>
                      {o.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  {o.items.map((item, i) => (
                    <span key={i}>{item.quantity}x {item.name}{i < o.items.length - 1 ? ', ' : ''}</span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {paymentLabel(o.paymentMethod)} · {format(parseISO(o.createdAt), 'dd/MM/yy HH:mm')}
                  </span>
                  {o.status === 'pendente' && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="text-[10px] h-7 px-2" onClick={() => updateStatus(o.id!, 'pago')}>
                        ✓ Confirmar
                      </Button>
                      <Button size="sm" variant="ghost" className="text-[10px] h-7 px-2 text-destructive" onClick={() => updateStatus(o.id!, 'cancelado')}>
                        ✕ Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
