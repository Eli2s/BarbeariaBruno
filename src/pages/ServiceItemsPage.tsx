import { useState } from 'react';
import { useServiceItems, useCreateServiceItem, useUpdateServiceItem, useDeleteServiceItem } from '@/hooks/useServiceItems';
import { AppLayout } from '@/components/AppLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Scissors } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import type { ServiceItem } from '@/types';

export default function ServiceItemsPage() {
  const { data: items = [], isLoading } = useServiceItems();
  const createItem = useCreateServiceItem();
  const updateItem = useUpdateServiceItem();
  const deleteItem = useDeleteServiceItem();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceItem | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  const openNew = () => { setEditingItem(null); setName(''); setPrice(''); setDialogOpen(true); };
  const openEdit = (item: ServiceItem) => { setEditingItem(item); setName(item.name); setPrice(String(item.price)); setDialogOpen(true); };

  const handleSave = async () => {
    if (!name.trim() || !price) { toast.error('Preencha todos os campos'); return; }
    try {
      if (editingItem) {
        await updateItem.mutateAsync({ id: editingItem.id!, name: name.trim(), price: Number(price) });
        toast.success('Serviço atualizado!');
      } else {
        await createItem.mutateAsync({ name: name.trim(), price: Number(price) });
        toast.success('Serviço cadastrado!');
      }
      setDialogOpen(false);
    } catch { toast.error('Erro ao salvar'); }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteItem.mutateAsync(id);
      toast.success('Serviço removido!');
    } catch { toast.error('Erro ao remover'); }
  };

  return (
    <AppLayout>
      <div className="p-4 max-w-lg md:max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-xl font-bold">Serviços</h1>
          <Button size="sm" className="gap-1" onClick={openNew}><Plus size={14} /> Novo</Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Scissors size={48} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum serviço cadastrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <Card key={item.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-xs text-primary font-medium">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id!)}><Trash2 size={14} /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Corte masculino" />
            </div>
            <div className="space-y-1">
              <Label>Preço (R$)</Label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
            </div>
            <Button className="w-full" onClick={handleSave}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
