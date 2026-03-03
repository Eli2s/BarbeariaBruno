/**
 * whatsapp-oauth-init
 * Generates the Meta OAuth URL and returns it so the frontend
 * can redirect the user to Facebook Login.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    if (!appId) {
      return new Response(
        JSON.stringify({ error: 'META_APP_ID not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { redirectUri } = await req.json();
    if (!redirectUri) {
      return new Response(
        JSON.stringify({ error: 'redirectUri is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a random state for CSRF protection
    const state = crypto.randomUUID();

    const scopes = [
      'whatsapp_business_management',
      'whatsapp_business_messaging',
      'business_management',
    ].join(',');

    const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
    authUrl.searchParams.set('client_id', appId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_type', 'code');

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString(), state }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
