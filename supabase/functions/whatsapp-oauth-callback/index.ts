/**
 * whatsapp-oauth-callback
 * Exchanges the authorization code for access/refresh tokens,
 * fetches WABA ID and Phone Number ID, then stores everything
 * securely in Supabase settings table via service-role key.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SETTINGS_KEY = 'whatsapp_oauth_credentials';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const appId = Deno.env.get('META_APP_ID');
    const appSecret = Deno.env.get('META_APP_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!appId || !appSecret || !supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration incomplete' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { code, redirectUri } = await req.json();
    if (!code || !redirectUri) {
      return new Response(
        JSON.stringify({ error: 'code and redirectUri are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Step 1: Exchange code for short-lived token ──────────────────
    const tokenRes = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}));
      console.error('Token exchange failed:', err);
      return new Response(
        JSON.stringify({ error: 'Token exchange failed', detail: err }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenRes.json();
    const shortLivedToken: string = tokenData.access_token;

    // ── Step 2: Exchange for long-lived token (60-day) ───────────────
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
    );

    let accessToken = shortLivedToken;
    let tokenExpiresAt: string | null = null;

    if (longTokenRes.ok) {
      const longData = await longTokenRes.json();
      accessToken = longData.access_token || shortLivedToken;
      if (longData.expires_in) {
        const expiresAt = new Date(Date.now() + longData.expires_in * 1000);
        tokenExpiresAt = expiresAt.toISOString();
      }
    }

    // ── Step 3: Fetch WhatsApp Business Account ID ───────────────────
    const meRes = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${accessToken}`
    );
    const meData = await meRes.json();
    const userId: string = meData.id;

    // Fetch connected WABA
    const wabaRes = await fetch(
      `https://graph.facebook.com/v19.0/${userId}/businesses?access_token=${accessToken}`
    );
    const wabaData = await wabaRes.json();
    const wabaId: string | null = wabaData?.data?.[0]?.id ?? null;

    // ── Step 4: Fetch Phone Number ID ────────────────────────────────
    let phoneNumberId: string | null = null;
    let displayPhoneNumber: string | null = null;

    if (wabaId) {
      const phonesRes = await fetch(
        `https://graph.facebook.com/v19.0/${wabaId}/phone_numbers?access_token=${accessToken}`
      );
      const phonesData = await phonesRes.json();
      if (phonesData?.data?.length > 0) {
        phoneNumberId = phonesData.data[0].id;
        displayPhoneNumber = phonesData.data[0].display_phone_number;
      }
    }

    // ── Step 5: Store securely in Supabase ───────────────────────────
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use a key-value approach in a settings table if available,
    // or store in a dedicated whatsapp_credentials table.
    // We'll use a generic approach storing JSON in a text column.
    const credentials = {
      accessToken,
      wabaId,
      phoneNumberId,
      displayPhoneNumber,
      tokenExpiresAt,
      connectedAt: new Date().toISOString(),
    };

    // Try upsert into a key-value store (uses existing settings structure)
    const { error: upsertError } = await supabase
      .from('whatsapp_credentials')
      .upsert({
        id: 1,
        access_token: accessToken,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        display_phone_number: displayPhoneNumber,
        token_expires_at: tokenExpiresAt,
        connected_at: new Date().toISOString(),
        is_connected: true,
      });

    if (upsertError) {
      console.error('Failed to store credentials:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store credentials', detail: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        phoneNumberId,
        displayPhoneNumber,
        wabaId,
        tokenExpiresAt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
