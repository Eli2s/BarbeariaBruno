import { useState, useRef } from 'react';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Plus, Edit, Trash2, Upload, X, Package } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function ProductsPage() {
  const { data: products = [], isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const resetForm = () => { setName(''); setCategory(''); setPrice(0); setStock(0); setDescription(''); setImage(''); setEditId(null); setImageMode('upload'); };

  const openEdit = (p: typeof products[0]) => {
    setEditId(p.id!); setName(p.name); setCategory(p.category); setPrice(p.price); setStock(p.stock); setDescription(p.description || ''); setImage(p.image || '');
    setImageMode(p.image?.startsWith('data:') ? 'upload' : 'url');
    setOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione um arquivo de imagem'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem muito grande (máx 5MB)'); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setImage(reader.result as string); };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Nome obrigatório'); return; }
    const data = { name: name.trim(), category, price, stock, description: description.trim() || undefined, image: image.trim() || undefined };
    try {
      if (editId) {
        await updateProduct.mutateAsync({ id: editId, ...data });
        toast.success('Produto atualizado!');
      } else {
        await createProduct.mutateAsync(data as any);
        toast.success('Produto cadastrado!');
      }
      resetForm(); setOpen(false);
    } catch { toast.error('Erro ao salvar produto'); }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteProduct.mutateAsync(id);
      toast.success('Produto removido!');
    } catch { toast.error('Erro ao remover'); }
  };

  return (
    <AppLayout>
      <div className="p-4 max-w-lg md:max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-xl font-bold">Produtos</h1>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus size={16} /> Novo</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editId ? 'Editar Produto' : 'Novo Produto'}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Nome *</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
                <div className="space-y-1"><Label>Categoria</Label><Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Finalização, Barba..." /></div>
                <div className="space-y-1"><Label>Preço (R$)</Label><Input type="number" step="0.01" value={price || ''} onChange={e => setPrice(Number(e.target.value))} /></div>
                <div className="space-y-1"><Label>Estoque</Label><Input type="number" value={stock || ''} onChange={e => setStock(Number(e.target.value))} /></div>
                <div className="space-y-1"><Label>Descrição</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição do produto..." rows={2} /></div>

                {/* Image Section */}
                <div className="space-y-2">
                  <Label>Imagem do Produto</Label>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant={imageMode === 'upload' ? 'default' : 'outline'} className="text-xs gap-1" onClick={() => setImageMode('upload')}><Upload size={12} /> Upload</Button>
                    <Button type="button" size="sm" variant={imageMode === 'url' ? 'default' : 'outline'} className="text-xs" onClick={() => setImageMode('url')}>URL</Button>
                  </div>

                  {imageMode === 'upload' ? (
                    <div className="space-y-2">
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      {image && image.startsWith('data:') ? (
                        <div className="relative">
                          <img src={image} alt="Preview" className="w-full h-32 object-cover rounded-lg border" />
                          <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setImage('')}><X size={12} /></Button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full h-28 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-secondary/30 transition-all cursor-pointer">
                          <Upload size={24} className="text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Clique para selecionar uma imagem</span>
                          <span className="text-[10px] text-muted-foreground/60">JPG, PNG, WebP · Máx 5MB</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <Input value={image} onChange={e => setImage(e.target.value)} placeholder="https://..." />
                  )}

                  {imageMode === 'url' && image && !image.startsWith('data:') && (
                    <img src={image} alt="Preview" className="w-full h-32 object-cover rounded-lg border" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  )}
                </div>

                <Button onClick={handleSubmit} className="w-full">{editId ? 'Salvar' : 'Cadastrar'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Carregando...</div>
        ) : (
          <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {filtered.map(p => (
              <Card key={p.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg gradient-subtle flex items-center justify-center shrink-0 overflow-hidden">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-12 h-12 object-cover rounded-lg" />
                    ) : (
                      <Package size={20} className="text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.category || 'Sem categoria'} · Estoque: {p.stock}</p>
                    <p className="text-sm font-semibold text-primary">R$ {p.price.toFixed(2).replace('.', ',')}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Edit size={14} /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id!)}><Trash2 size={14} /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
