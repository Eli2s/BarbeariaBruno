/**
 * whatsappOAuth.ts
 * Client-side service for the WhatsApp OAuth flow.
 * All sensitive operations are delegated to edge functions.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;

function edgeUrl(fn: string): string {
  return `${SUPABASE_URL}/functions/v1/${fn}`;
}

export interface OAuthCredentials {
  connected: boolean;
  wabaId?: string;
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  tokenExpiresAt?: string;
  connectedAt?: string;
}

/**
 * Generates a Meta OAuth URL via edge function.
 * Returns { authUrl, state } to redirect the user.
 */
export async function initMetaOAuth(): Promise<{ authUrl: string; state: string }> {
  // The redirect URI must match what is registered in your Meta App OAuth settings
  const redirectUri = `${window.location.origin}/whatsapp-oauth-callback`;

  const res = await fetch(edgeUrl('whatsapp-oauth-init'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ redirectUri }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao iniciar autenticação Meta.');
  }

  return res.json();
}

/**
 * Exchanges the authorization code for tokens and stores credentials.
 * Called after the user is redirected back from Meta OAuth.
 */
export async function exchangeOAuthCode(code: string): Promise<OAuthCredentials> {
  const redirectUri = `${window.location.origin}/whatsapp-oauth-callback`;

  const res = await fetch(edgeUrl('whatsapp-oauth-callback'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao trocar código de autorização.');
  }

  const data = await res.json();
  return {
    connected: true,
    wabaId: data.wabaId,
    phoneNumberId: data.phoneNumberId,
    displayPhoneNumber: data.displayPhoneNumber,
    tokenExpiresAt: data.tokenExpiresAt,
  };
}

/**
 * Fetches current connection status from the server.
 */
export async function getOAuthCredentials(): Promise<OAuthCredentials> {
  const res = await fetch(edgeUrl('whatsapp-get-credentials'), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    return { connected: false };
  }

  return res.json();
}

/**
 * Refreshes the Meta access token (call before expiry).
 */
export async function refreshOAuthToken(): Promise<{ success: boolean; tokenExpiresAt?: string }> {
  const res = await fetch(edgeUrl('whatsapp-token-refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao renovar token.');
  }

  return res.json();
}

/**
 * Disconnects WhatsApp by clearing stored credentials.
 */
export async function disconnectOAuth(): Promise<void> {
  const res = await fetch(edgeUrl('whatsapp-disconnect'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao desconectar.');
  }
}
