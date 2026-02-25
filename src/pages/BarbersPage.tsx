import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Plus, Pencil, Trash2, ChevronDown, User } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { Barber, BarberItemCommission } from '@/types';

import { useBarbers, useCreateBarber, useUpdateBarber, useDeleteBarber } from '@/hooks/useBarbers';
import { useServiceItems } from '@/hooks/useServiceItems';
import { useProducts } from '@/hooks/useProducts';
import {
  useBarberCommissions,
  useDeleteBarberCommissionsByBarber,
  useBulkCreateBarberCommissions,
} from '@/hooks/useBarberCommissions';

export default function BarbersPage() {
  const navigate = useNavigate();

  // React Query hooks
  const { data: barbers = [] } = useBarbers();
  const { data: serviceItems = [] } = useServiceItems();
  const { data: products = [] } = useProducts();
  const { data: allCommissions = [] } = useBarberCommissions();

  // Mutations
  const createBarberMutation = useCreateBarber();
  const updateBarberMutation = useUpdateBarber();
  const deleteBarberMutation = useDeleteBarber();
  const deleteCommissionsByBarberMutation = useDeleteBarberCommissionsByBarber();
  const bulkCreateCommissionsMutation = useBulkCreateBarberCommissions();

  const [editing, setEditing] = useState<Barber | null>(null);
  const [form, setForm] = useState({ name: '', nickname: '', whatsapp: '', defaultCommission: 50 });
  const [showForm, setShowForm] = useState(false);
  const [itemCommissions, setItemCommissions] = useState<Record<string, number | ''>>({});
  const [expandedBarber, setExpandedBarber] = useState<number | null>(null);

  const resetForm = () => {
    setForm({ name: '', nickname: '', whatsapp: '', defaultCommission: 50 });
    setItemCommissions({});
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (barber: Barber) => {
    setForm({
      name: barber.name,
      nickname: barber.nickname,
      whatsapp: barber.whatsapp,
      defaultCommission: barber.defaultCommission,
    });
    // Load item commissions from allCommissions
    const comms = allCommissions.filter(c => c.barberId === barber.id);
    const map: Record<string, number | ''> = {};
    comms.forEach(c => { map[`${c.itemType}-${c.itemId}`] = c.percentage; });
    setItemCommissions(map);
    setEditing(barber);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || form.defaultCommission < 0 || form.defaultCommission > 100) {
      toast.error('Preencha nome e comissão válida (0-100%)');
      return;
    }

    try {
      let barberId: number;
      if (editing?.id) {
        await updateBarberMutation.mutateAsync({
          id: editing.id,
          name: form.name,
          nickname: form.nickname,
          whatsapp: form.whatsapp,
          defaultCommission: form.defaultCommission,
        });
        barberId = editing.id;
      } else {
        const newBarber = await createBarberMutation.mutateAsync({
          name: form.name,
          nickname: form.nickname,
          whatsapp: form.whatsapp,
          defaultCommission: form.defaultCommission,
          isActive: true,
          createdAt: new Date().toISOString(),
        });
        barberId = newBarber.id!;
      }

      // Save item commissions: delete existing, then bulk create new
      await deleteCommissionsByBarberMutation.mutateAsync(barberId);
      const newComms: Omit<BarberItemCommission, 'id'>[] = [];
      for (const [key, val] of Object.entries(itemCommissions)) {
        if (val === '' || val === undefined) continue;
        const [type, id] = key.split('-');
        newComms.push({
          barberId,
          itemId: Number(id),
          itemType: type as 'service' | 'product',
          percentage: Number(val),
        });
      }
      if (newComms.length > 0) {
        await bulkCreateCommissionsMutation.mutateAsync(newComms);
      }

      toast.success(editing ? 'Barbeiro atualizado!' : 'Barbeiro cadastrado!');
      resetForm();
    } catch {
      toast.error('Erro ao salvar barbeiro');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteBarberMutation.mutateAsync(id);
      await deleteCommissionsByBarberMutation.mutateAsync(id);
      toast.success('Barbeiro removido!');
    } catch {
      toast.error('Erro ao remover barbeiro');
    }
  };

  const toggleActive = async (barber: Barber) => {
    try {
      await updateBarberMutation.mutateAsync({
        id: barber.id!,
        isActive: !barber.isActive,
      });
      toast.success(barber.isActive ? 'Barbeiro desativado' : 'Barbeiro ativado');
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  const getBarberCommissions = (barberId: number) =>
    allCommissions.filter(c => c.barberId === barberId);

  return (
    <AppLayout>
      <div className="p-4 max-w-lg md:max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3 pt-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft size={20} /></Button>
          <h1 className="text-xl font-bold flex-1">Barbeiros</h1>
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }} className="gap-1">
            <Plus size={14} /> Novo
          </Button>
        </div>

        {showForm && (
          <Card className="border-primary/30">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold">{editing ? 'Editar Barbeiro' : 'Novo Barbeiro'}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Apelido</Label>
                  <Input value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} placeholder="Apelido" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">WhatsApp</Label>
                  <Input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="11999887766" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Comissão Padrão (%) *</Label>
                  <Input type="number" min={0} max={100} value={form.defaultCommission} onChange={e => setForm({ ...form, defaultCommission: Number(e.target.value) })} />
                </div>
              </div>

              {/* Per-item commissions */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-primary cursor-pointer">
                  <ChevronDown size={14} /> Comissões Específicas por Item
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-3">
                  {serviceItems.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Serviços</p>
                      {serviceItems.map(svc => (
                        <div key={svc.id} className="flex items-center justify-between text-xs">
                          <span>{svc.name} (R$ {svc.price.toFixed(2).replace('.', ',')})</span>
                          <Input
                            type="number" min={0} max={100}
                            className="w-20 h-7 text-xs text-right"
                            placeholder={`${form.defaultCommission}%`}
                            value={itemCommissions[`service-${svc.id}`] ?? ''}
                            onChange={e => setItemCommissions({ ...itemCommissions, [`service-${svc.id}`]: e.target.value === '' ? '' : Number(e.target.value) })}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {products.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Produtos</p>
                      {products.map(prod => (
                        <div key={prod.id} className="flex items-center justify-between text-xs">
                          <span>{prod.name} (R$ {prod.price.toFixed(2).replace('.', ',')})</span>
                          <Input
                            type="number" min={0} max={100}
                            className="w-20 h-7 text-xs text-right"
                            placeholder={`${form.defaultCommission}%`}
                            value={itemCommissions[`product-${prod.id}`] ?? ''}
                            onChange={e => setItemCommissions({ ...itemCommissions, [`product-${prod.id}`]: e.target.value === '' ? '' : Number(e.target.value) })}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleSave}>{editing ? 'Salvar' : 'Cadastrar'}</Button>
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Barbers List */}
        <div className="space-y-2">
          {barbers.map(b => {
            const comms = getBarberCommissions(b.id!);
            return (
              <Card key={b.id} className={!b.isActive ? 'opacity-50' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <User size={18} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{b.name}</p>
                        {b.nickname && <Badge variant="outline" className="text-[10px]">{b.nickname}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Comissão: {b.defaultCommission}% · {b.whatsapp || 'Sem WhatsApp'}
                      </p>
                      {comms.length > 0 && (
                        <p className="text-[10px] text-primary mt-0.5">{comms.length} comissão(ões) específica(s)</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Switch checked={b.isActive} onCheckedChange={() => toggleActive(b)} />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(b)}>
                        <Pencil size={13} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(b.id!)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {barbers.length === 0 && !showForm && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum barbeiro cadastrado.</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
