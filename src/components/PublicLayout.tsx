import { ReactNode } from 'react';
import { Scissors } from 'lucide-react';

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="gradient-primary py-4 px-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Scissors className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Bruno Barbearia</h1>
            <p className="text-[10px] text-white/70 uppercase tracking-widest">Loja Online</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs text-muted-foreground">© 2025 Bruno Barbearia. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
