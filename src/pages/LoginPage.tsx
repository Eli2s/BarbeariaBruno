import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const login = useAuthStore(s => s.login);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(pin)) {
      navigate('/');
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6 w-full max-w-xs animate-fade-in">
        <div className="w-20 h-20 rounded-2xl gradient-subtle gradient-glow flex items-center justify-center">
          <Scissors className="text-primary" size={40} />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight gradient-text">Bruno</h1>
          <p className="text-primary font-semibold text-sm tracking-widest uppercase">Barbearia</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4 mt-4">
          <Input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="PIN de acesso"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className={cn("text-center text-2xl tracking-[0.5em] h-14", error && "border-destructive")}
          />
          {error && <p className="text-destructive text-xs text-center">PIN incorreto. Tente novamente.</p>}
          <Button type="submit" className="w-full h-12 font-semibold" disabled={pin.length < 4}>
            Entrar
          </Button>
          {/* <p className="text-muted-foreground text-[10px] text-center">PIN padrão: 1234</p> */}
        </form>
      </div>
    </div>
  );
}
