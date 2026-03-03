import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useClient, useCreateClient, useUpdateClient } from '@/hooks/useClients';
import { AppLayout } from '@/components/AppLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Upload, X, User } from 'lucide-react';
import { toast } from 'sonner';
import { phoneMask } from '@/lib/format';

export default function ClientFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { data: existingClient } = useClient(id ? Number(id) : undefined);
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [photo, setPhoto] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (existingClient) {
      setName(existingClient.name);
      setNickname(existingClient.nickname);
      setWhatsapp(existingClient.whatsapp ? phoneMask(existingClient.whatsapp) : '');
      setPhoto(existingClient.photo || '');
      setTags(existingClient.tags.join(', '));
    }
  }, [existingClient]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx. 2MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhoto('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    const digits = whatsapp.replace(/\D/g, '');
    if (digits.length !== 11) {
      toast.error('WhatsApp deve ter exatamente 11 dígitos (DDD + número)');
      return;
    }

    const data = {
      name: name.trim(),
      nickname: nickname.trim() || name.trim(),
      whatsapp: digits,
      photo: photo || undefined,
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
          {/* Foto - Upload de arquivo */}
          <div className="space-y-2">
            <Label>Foto</Label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-secondary border-2 border-dashed border-border flex items-center justify-center overflow-hidden shrink-0">
                {photo ? (
                  <img src={photo} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <User size={28} className="text-muted-foreground/40" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={13} /> {photo ? 'Trocar Foto' : 'Enviar Foto'}
                </Button>
                {photo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs text-destructive hover:text-destructive"
                    onClick={handleRemovePhoto}
                  >
                    <X size={13} /> Remover
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Nome completo *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do cliente" />
          </div>
          <div className="space-y-1">
            <Label>Apelido</Label>
            <Input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Apelido" />
          </div>
          <div className="space-y-1">
            <Label>WhatsApp * <span className="text-muted-foreground text-[10px]">(11 dígitos com DDD)</span></Label>
            <Input
              type="tel"
              inputMode="numeric"
              maxLength={15}
              value={whatsapp}
              onChange={e => setWhatsapp(phoneMask(e.target.value))}
              placeholder="(11) 99999-9999"
            />
            {whatsapp && whatsapp.replace(/\D/g, '').length !== 11 && (
              <p className="text-[10px] text-amber-500 mt-0.5">
                {whatsapp.replace(/\D/g, '').length}/11 dígitos
              </p>
            )}
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
