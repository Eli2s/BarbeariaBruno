/**
 * WhatsAppOAuthCallbackPage
 * Handles the redirect from Meta after the user authenticates.
 * Reads `code` and `state` from query params, calls the edge function,
 * then redirects back to settings with a success/error indicator.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { exchangeOAuthCode } from '@/lib/whatsappOAuth';

export default function WhatsAppOAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error || !code) {
      setErrorMsg(errorDescription || error || 'Autorização negada pela Meta.');
      setStatus('error');
      setTimeout(() => navigate('/configuracoes/whatsapp?oauth=error'), 3000);
      return;
    }

    exchangeOAuthCode(code)
      .then(() => {
        setStatus('success');
        setTimeout(() => navigate('/configuracoes/whatsapp?oauth=success'), 2000);
      })
      .catch(err => {
        setErrorMsg(err.message || 'Erro ao conectar com a Meta.');
        setStatus('error');
        setTimeout(() => navigate('/configuracoes/whatsapp?oauth=error'), 3500);
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8 max-w-sm">
        {status === 'loading' && (
          <>
            <Loader2 size={48} className="animate-spin text-primary mx-auto" />
            <h2 className="text-lg font-semibold">Conectando sua conta WhatsApp Business...</h2>
            <p className="text-sm text-muted-foreground">Aguarde enquanto trocamos as credenciais com a Meta.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={48} className="text-chart-2 mx-auto" />
            <h2 className="text-lg font-semibold text-chart-2">Conta conectada!</h2>
            <p className="text-sm text-muted-foreground">Redirecionando para as configurações...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={48} className="text-destructive mx-auto" />
            <h2 className="text-lg font-semibold text-destructive">Falha na conexão</h2>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <p className="text-xs text-muted-foreground">Redirecionando...</p>
          </>
        )}
      </div>
    </div>
  );
}
