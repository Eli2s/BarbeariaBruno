import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ServiceItemsPage() {
  const serviceItems = useLiveQuery(() => db.serviceItems.toArray()) ?? [];
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);

  const filtered = serviceItems.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const resetForm = () => { setName(''); setPrice(0); setEditId(null); };

  const openEdit = (s: typeof serviceItems[0]) => {
    setEditId(s.id!); setName(s.name); setPrice(s.price); setOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Nome obrigatório'); return; }
    const data = { name: name.trim(), price };
    if (editId) {
      await db.serviceItems.update(editId, data);
      toast.success('Serviço atualizado!');
    } else {
      await db.serviceItems.add(data);
      toast.success('Serviço cadastrado!');
    }
    resetForm(); setOpen(false);
  };

  const handleDelete = async (id: number) => {
    await db.serviceItems.delete(id);
    toast.success('Serviço removido!');
  };

  return (
    <AppLayout>
      <div className="p-4 max-w-lg md:max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-xl font-bold">Serviços</h1>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus size={16} /> Novo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Nome *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Corte Degradê, Barba..." /></div>
                <div className="space-y-1"><Label>Preço (R$)</Label><Input type="number" step="0.01" value={price || ''} onChange={e => setPrice(Number(e.target.value))} /></div>
                <Button onClick={handleSubmit} className="w-full">{editId ? 'Salvar' : 'Cadastrar'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar serviço..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
          {filtered.map(s => (
            <Card key={s.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className="text-sm font-semibold text-primary">R$ {s.price.toFixed(2).replace('.', ',')}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}><Edit size={14} /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(s.id!)}><Trash2 size={14} /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhum serviço cadastrado</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
