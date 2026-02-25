import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useClient, useCreateClient, useUpdateClient } from '@/hooks/useClients';
import { AppLayout } from '@/components/AppLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { data: existingClient } = useClient(id ? Number(id) : undefined);
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [photo, setPhoto] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (existingClient) {
      setName(existingClient.name);
      setNickname(existingClient.nickname);
      setWhatsapp(existingClient.whatsapp);
      setPhoto(existingClient.photo || '');
      setTags(existingClient.tags.join(', '));
    }
  }, [existingClient]);

  const handleSave = async () => {
    if (!name.trim() || !whatsapp.trim()) {
      toast.error('Nome e WhatsApp são obrigatórios');
      return;
    }

    const data = {
      name: name.trim(),
      nickname: nickname.trim() || name.trim(),
      whatsapp: whatsapp.trim(),
      photo: photo.trim() || undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: isEditing ? existingClient!.createdAt : new Date().toISOString(),
    };

    try {
      if (isEditing) {
        await updateClient.mutateAsync({ id: Number(id), ...data });
        toast.success('Cliente atualizado!');
      } else {
        await createClient.mutateAsync(data as any);
        toast.success('Cliente cadastrado!');
      }
      navigate(-1);
    } catch {
      toast.error('Erro ao salvar cliente');
    }
  };

  return (
    <AppLayout>
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3 pt-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft size={20} /></Button>
          <h1 className="text-xl font-bold">{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</h1>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Nome completo *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do cliente" />
          </div>
          <div className="space-y-1">
            <Label>Apelido</Label>
            <Input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Apelido" />
          </div>
          <div className="space-y-1">
            <Label>WhatsApp *</Label>
            <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="11999887766" />
          </div>
          <div className="space-y-1">
            <Label>Foto (URL)</Label>
            <Input value={photo} onChange={e => setPhoto(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-1">
            <Label>Tags (separadas por vírgula)</Label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="VIP, Barba, Mensal" />
          </div>
        </div>

        <Button className="w-full gap-2" onClick={handleSave} disabled={createClient.isPending || updateClient.isPending}>
          <Save size={16} /> {isEditing ? 'Salvar Alterações' : 'Cadastrar Cliente'}
        </Button>
      </div>
    </AppLayout>
  );
}
