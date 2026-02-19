import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { PublicLayout } from '@/components/PublicLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, ShoppingCart, Package } from 'lucide-react';
import { useEffect } from 'react';
import { seedDatabase } from '@/db/seed';

export default function StorePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => { seedDatabase(); }, []);

  const products = useLiveQuery(() => db.products.toArray()) ?? [];
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase());
    const matchCategory = !selectedCategory || p.category === selectedCategory;
    return matchSearch && matchCategory && p.stock > 0;
  });

  return (
    <PublicLayout>
      <div className="p-4 max-w-2xl mx-auto space-y-6 py-6">
        {/* Hero */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold gradient-text">Nossos Produtos</h2>
          <p className="text-sm text-muted-foreground">Produtos profissionais selecionados para você</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button
              size="sm"
              variant={selectedCategory === null ? 'default' : 'outline'}
              className="text-xs shrink-0"
              onClick={() => setSelectedCategory(null)}
            >
              Todos
            </Button>
            {categories.map(cat => (
              <Button
                key={cat}
                size="sm"
                variant={selectedCategory === cat ? 'default' : 'outline'}
                className="text-xs shrink-0"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        )}

        {/* Products Grid */}
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(p => (
            <Card key={p.id} className="overflow-hidden hover:shadow-lg hover:shadow-primary/10 transition-all">
              <div className="aspect-square gradient-subtle flex items-center justify-center">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <Package size={40} className="text-muted-foreground/40" />
                )}
              </div>
              <CardContent className="p-3 space-y-2">
                <div>
                  <p className="font-semibold text-sm leading-tight">{p.name}</p>
                  {p.category && (
                    <Badge variant="secondary" className="text-[9px] mt-1">{p.category}</Badge>
                  )}
                  {p.description && (
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold gradient-text">
                    R$ {p.price.toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="w-full gap-1 text-xs"
                  onClick={() => navigate(`/loja/checkout/${p.id}`)}
                >
                  <ShoppingCart size={14} /> Comprar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum produto encontrado</p>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
