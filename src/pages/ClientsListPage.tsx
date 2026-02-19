import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { AppLayout } from '@/components/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function ClientsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const clients = useLiveQuery(() => db.clients.toArray()) ?? [];
  const services = useLiveQuery(() => db.services.toArray()) ?? [];

  const lastVisit = (clientId: number) => {
    const svc = services.filter(s => s.clientId === clientId).sort((a, b) => b.date.localeCompare(a.date));
    return svc[0] ? format(parseISO(svc[0].date), 'dd/MM/yyyy') : 'Nunca';
  };

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.nickname.toLowerCase().includes(q) || c.whatsapp.includes(q);
  });

  return (
    <AppLayout>
      <div className="p-4 max-w-lg md:max-w-full mx-auto space-y-4">
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-xl font-bold">Clientes</h1>
          <Button size="sm" onClick={() => navigate('/clientes/novo')} className="gap-1">
            <Plus size={16} /> Novo
          </Button>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, apelido ou WhatsApp..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
          {filtered.map(c => (
            <Card
              key={c.id}
              className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md hover:shadow-primary/10"
              onClick={() => navigate(`/clientes/${c.id}`)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full gradient-subtle flex items-center justify-center shrink-0">
                  {c.photo ? (
                    <img src={c.photo} alt={c.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <User size={18} className="text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{c.name}</p>
                    {c.tags[0] && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{c.tags[0]}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{c.nickname} · Última: {lastVisit(c.id!)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente encontrado</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
