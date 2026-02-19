import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '@/db/database';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { phoneMask } from '@/lib/format';
import { toast } from 'sonner';

export default function ClientFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [photo, setPhoto] = useState('');

  useEffect(() => {
    if (isEdit) {
      db.clients.get(Number(id)).then(c => {
        if (c) {
          setName(c.name);
          setNickname(c.nickname);
          setWhatsapp(phoneMask(c.whatsapp));
          setPhoto(c.photo || '');
        }
      });
    }
  }, [id, isEdit]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = whatsapp.replace(/\D/g, '');
    if (!name.trim()) {
      toast.error('Preencha o nome do cliente');
      return;
    }
    const data = { name: name.trim(), nickname: nickname.trim(), whatsapp: cleanPhone, photo, tags: [] as string[] };
    if (isEdit) {
      await db.clients.update(Number(id), data);
      toast.success('Cliente atualizado!');
    } else {
      await db.clients.add({ ...data, createdAt: new Date().toISOString().slice(0, 10) });
      toast.success('Cliente cadastrado!');
    }
    navigate(-1);
  };

  return (
    <AppLayout>
      <div className="p-4 max-w-lg md:max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3 pt-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft size={20} /></Button>
          <h1 className="text-xl font-bold">{isEdit ? 'Editar Cliente' : 'Novo Cliente'}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do cliente" />
          </div>
          <div className="space-y-2">
            <Label>Apelido / Como chamo</Label>
            <Input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Como você chama ele" />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp</Label>
            <Input
              value={whatsapp}
              onChange={e => setWhatsapp(phoneMask(e.target.value))}
              placeholder="(11) 99999-9999"
              inputMode="numeric"
            />
          </div>
          <div className="space-y-2">
            <Label>Foto</Label>
            <Input type="file" accept="image/*" onChange={handlePhotoUpload} />
            {photo && <img src={photo} alt="Preview" className="w-16 h-16 rounded-full object-cover" />}
          </div>
          <Button type="submit" className="w-full h-12 font-semibold">
            {isEdit ? 'Salvar Alterações' : 'Cadastrar Cliente'}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
