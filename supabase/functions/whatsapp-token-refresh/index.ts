/**
 * whatsapp-token-refresh
 * Refreshes the long-lived Meta access token before it expires.
 * Long-lived tokens can be refreshed any time before expiry.
 * Call this ~30 days before expiration (token is valid ~60 days).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch current credentials
    const { data: creds, error: fetchError } = await supabase
      .from('whatsapp_credentials')
      .select('*')
      .eq('id', 1)
      .single();

    if (fetchError || !creds) {
      return new Response(
        JSON.stringify({ error: 'No credentials found to refresh' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentToken: string = creds.access_token;

    // Exchange current long-lived token for a new one
    const refreshRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${currentToken}`
    );

    if (!refreshRes.ok) {
      const err = await refreshRes.json().catch(() => ({}));
      console.error('Token refresh failed:', err);
      return new Response(
        JSON.stringify({ error: 'Token refresh failed', detail: err }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const refreshData = await refreshRes.json();
    const newToken: string = refreshData.access_token;
    let newExpiresAt: string | null = null;

    if (refreshData.expires_in) {
      newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
    }

    // Update stored credentials
    const { error: updateError } = await supabase
      .from('whatsapp_credentials')
      .update({
        access_token: newToken,
        token_expires_at: newExpiresAt,
      })
      .eq('id', 1);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update token', detail: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, tokenExpiresAt: newExpiresAt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Token refresh error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
