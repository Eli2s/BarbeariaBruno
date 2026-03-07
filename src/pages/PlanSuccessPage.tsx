import { CheckCircle, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Página pública exibida após o cliente concluir o pagamento no Stripe.
 * URL: /planos/sucesso?session_id=XXX
 */
export default function PlanSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Scissors size={26} className="text-white" />
          </div>
        </div>

        {/* Ícone de sucesso */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
            <CheckCircle size={40} className="text-emerald-500" />
          </div>
        </div>

        {/* Texto */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Assinatura confirmada!</h1>
          <p className="text-muted-foreground text-sm">
            Seu plano foi ativado com sucesso. Em breve você receberá uma confirmação pelo WhatsApp.
          </p>
        </div>

        {/* Card informativo */}
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 space-y-2 text-sm text-left">
            <p className="font-medium text-emerald-700 dark:text-emerald-400">O que acontece agora?</p>
            <ul className="space-y-1 text-muted-foreground text-xs list-disc list-inside">
              <li>Seu plano já está ativo na barbearia</li>
              <li>A cobrança será feita automaticamente na renovação</li>
              <li>Para dúvidas, entre em contato pelo WhatsApp</li>
            </ul>
          </CardContent>
        </Card>

        {/* Fechar / Voltar */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.close()}
        >
          Fechar
        </Button>
      </div>
    </div>
  );
}
