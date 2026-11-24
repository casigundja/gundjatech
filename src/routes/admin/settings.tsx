import { Hono } from 'hono';
import { Env, AppVariables } from '../../types/env';
import { getRequestBody } from '../../lib/request';
import { sendWhatsAppTextMessage } from '../../services/whatsapp';
import { getSocialFeed, clearSocialFeedCache } from '../../services/social-feed';
import { AdminSettingsView } from '../../views/admin/settings';

export const adminSettingsRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

adminSettingsRoutes.get('/configuracoes', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const successMessage = c.req.query('success') || null;
    const errorMessage = c.req.query('error') || null;

    const settingsMap: Record<string, string> = {};
    try {
        const res = await db.prepare(`SELECT key, value FROM system_settings`).all<{ key: string; value: string }>();
        for (const row of res.results || []) {
            settingsMap[row.key] = row.value || '';
        }
    } catch { }

    const activeProvider = settingsMap.whatsapp_provider || 'zapi_omni';
    const whatsappSyncEnabled = settingsMap.whatsapp_sync_enabled !== '0';
    const whatsappAiEnabled = settingsMap.whatsapp_ai_enabled !== '0';
    const whatsappDirectorEnabled = settingsMap.whatsapp_director_enabled !== '0';
    const whatsappConfigured =
        activeProvider === 'zapi' || activeProvider === 'zapi_omni'
            ? Boolean(settingsMap.whatsapp_zapi_instance_id && (settingsMap.whatsapp_zapi_token || settingsMap.whatsapp_zapi_client_token))
            : activeProvider === 'evolution'
                ? Boolean(settingsMap.whatsapp_evolution_url && settingsMap.whatsapp_evolution_instance && settingsMap.whatsapp_evolution_api_key)
                : Boolean((c.env.WHATSAPP_ACCESS_TOKEN || settingsMap.whatsapp_access_token) && (c.env.WHATSAPP_PHONE_NUMBER_ID || settingsMap.whatsapp_phone_number_id));

    let whatsappLastError: string | null = null;
    if (c.env?.KV_CACHE) {
        try {
            const rawLastSend = await c.env.KV_CACHE.get('wa:debug:last_send');
            if (rawLastSend) {
                const parsed = JSON.parse(rawLastSend) as { ok?: boolean; error?: string };
                if (parsed && parsed.ok === false && parsed.error) {
                    whatsappLastError = parsed.error;
                }
            }
        } catch { }
    }

    settingsMap.has_zapi_token = settingsMap.whatsapp_zapi_token ? '1' : '';
    settingsMap.has_zapi_client_token = settingsMap.whatsapp_zapi_client_token ? '1' : '';
    settingsMap.has_evolution_key = settingsMap.whatsapp_evolution_api_key ? '1' : '';
    delete settingsMap.whatsapp_access_token;
    delete settingsMap.whatsapp_zapi_token;
    delete settingsMap.whatsapp_zapi_client_token;
    delete settingsMap.whatsapp_evolution_api_key;

    const origin = new URL(c.req.url).origin;
    return c.html(
        <AdminSettingsView
            currentUser={user}
            settings={settingsMap}
            whatsappConfigured={whatsappConfigured}
            whatsappSyncEnabled={whatsappSyncEnabled}
            whatsappAiEnabled={whatsappAiEnabled}
            whatsappDirectorEnabled={whatsappDirectorEnabled}
            whatsappLastError={whatsappLastError}
            webhookUrl={`${origin}/api/webhooks/whatsapp`}
            verifyToken={c.env.WHATSAPP_VERIFY_TOKEN || 'gundjatech_wa_verify_2026'}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
});

adminSettingsRoutes.post('/configuracoes', async (c) => {
    const db = c.env.DB;
    const body = await getRequestBody(c);

    const pairs: Array<[string, string, string]> = [
        ['company_name', String(body.company_name || 'GundjaTech').trim(), 'general'],
        ['company_cnpj', String(body.company_cnpj || '').trim(), 'general'],
        ['company_slogan', String(body.company_slogan || '').trim(), 'general'],
        ['company_email', String(body.company_email || '').trim(), 'general'],
        ['company_phone', String(body.company_phone || '').trim(), 'general'],
        ['company_whatsapp', String(body.company_whatsapp || '').trim(), 'general'],
        ['whatsapp_director_phone', String(body.whatsapp_director_phone || '').replace(/\D+/g, ''), 'integrations'],
        ['company_address', String(body.company_address || '').trim(), 'general'],
        ['whatsapp_sync_enabled', body.whatsapp_sync_enabled ? '1' : '0', 'integrations'],
        ['whatsapp_ai_enabled', body.whatsapp_ai_enabled ? '1' : '0', 'integrations'],
        ['whatsapp_director_enabled', body.whatsapp_director_enabled ? '1' : '0', 'integrations']
    ];

    const provider = String(body.whatsapp_provider || '').trim();
    if (provider === 'zapi' || provider === 'zapi_omni' || provider === 'evolution' || provider === 'meta') {
        pairs.push(['whatsapp_provider', provider, 'integrations']);
    }

    const optionalSecrets: Array<[string, string]> = [
        ['whatsapp_phone_number_id', String(body.whatsapp_phone_number_id || '').trim()],
        ['whatsapp_access_token', String(body.whatsapp_access_token || '').trim()],
        ['whatsapp_zapi_instance_id', String(body.whatsapp_zapi_instance_id || '').trim()],
        ['whatsapp_zapi_token', String(body.whatsapp_zapi_token || '').trim()],
        ['whatsapp_zapi_client_token', String(body.whatsapp_zapi_client_token || '').trim()],
        ['whatsapp_evolution_url', String(body.whatsapp_evolution_url || '').trim()],
        ['whatsapp_evolution_instance', String(body.whatsapp_evolution_instance || '').trim()],
        ['whatsapp_evolution_api_key', String(body.whatsapp_evolution_api_key || '').trim()],
        ['meta_social_access_token', String(body.meta_social_access_token || '').trim()],
        ['payment_gateway_api_key', String(body.payment_gateway_api_key || '').trim()],
        ['payment_gateway_webhook_secret', String(body.payment_gateway_webhook_secret || '').trim()]
    ];
    for (const [k, v] of optionalSecrets) {
        if (v) pairs.push([k, v, k.startsWith('payment_') ? 'payments' : 'integrations']);
    }

    // Redes Sociais: Instagram & Facebook Sync + Curadoria Manual
    pairs.push(
        ['meta_ig_account_id', String(body.meta_ig_account_id || '').trim(), 'social'],
        ['meta_fb_page_id', String(body.meta_fb_page_id || '').trim(), 'social'],
        ['payment_pix_key', String(body.payment_pix_key || '').trim(), 'payments'],
        ['payment_pix_holder', String(body.payment_pix_holder || '').trim(), 'payments'],
        ['payment_pix_city', String(body.payment_pix_city || '').trim(), 'payments'],
        ['payment_bank_name', String(body.payment_bank_name || '').trim(), 'payments'],
        ['payment_bank_agency', String(body.payment_bank_agency || '').trim(), 'payments'],
        ['payment_bank_account', String(body.payment_bank_account || '').trim(), 'payments'],
        ['payment_bank_cnpj', String(body.payment_bank_cnpj || '').trim(), 'payments'],
        ['payment_gateway_provider', String(body.payment_gateway_provider || 'static').trim(), 'payments']
    );

    const manualReels: Array<{ permalink: string; imageUrl: string; caption: string; platform: string }> = [];
    for (let i = 1; i <= 4; i++) {
        const link = String(body[`social_reel_url_${i}`] || '').trim();
        const cover = String(body[`social_reel_cover_${i}`] || '').trim();
        const caption = String(body[`social_reel_caption_${i}`] || '').trim();
        if (link && link.startsWith('http')) {
            manualReels.push({
                permalink: link,
                imageUrl: cover,
                caption: caption || 'Conteúdo oficial da GundjaTech',
                platform: link.includes('facebook.com') ? 'facebook' : 'instagram'
            });
        }
    }
    pairs.push(['social_manual_reels_json', JSON.stringify(manualReels), 'social']);

    try {
        for (const [key, value, groupName] of pairs) {
            await db.prepare(
                `INSERT INTO system_settings (key, value, type, group_name, created_at, updated_at)
                 VALUES (?, ?, 'string', ?, datetime('now'), datetime('now'))
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
            ).bind(key, value, groupName).run();
        }
    } catch { }

    await clearSocialFeedCache(c.env);

    return c.redirect('/admin/configuracoes?success=Configurações gerais e redes sociais salvas com sucesso');
});

adminSettingsRoutes.post('/configuracoes/sincronizar-redes', async (c) => {
    const feed = await getSocialFeed(c.env, { forceRefresh: true });
    if (feed.source === 'meta_api' && feed.items.length > 0) {
        return c.redirect(`/admin/configuracoes?success=${encodeURIComponent(`${feed.items.length} publicação(ões)/Reels sincronizados em tempo real via Meta Graph API!`)}`);
    }
    if (feed.source === 'manual' && feed.items.length > 0) {
        return c.redirect(`/admin/configuracoes?success=${encodeURIComponent(`Cache atualizado com ${feed.items.length} Reels em destaque (modo manual).`)}`);
    }
    return c.redirect(`/admin/configuracoes?error=${encodeURIComponent(feed.error || 'Configure o Instagram Business Account ID + Meta Access Token ou adicione links manuais antes de sincronizar.')}`);
});

adminSettingsRoutes.post('/configuracoes/testar-whatsapp', async (c) => {
    const db = c.env.DB;
    let targetPhone = '';
    try {
        const rows = await db.prepare(
            `SELECT key, value FROM system_settings WHERE key IN ('whatsapp_director_phone', 'company_whatsapp')`
        ).all<{ key: string; value: string }>();
        const map: Record<string, string> = {};
        for (const r of rows.results || []) map[r.key] = String(r.value || '').replace(/\D+/g, '');
        targetPhone = map.whatsapp_director_phone || map.company_whatsapp || '';
    } catch { }

    if (!targetPhone) {
        return c.redirect('/admin/configuracoes?error=Informe um número de WhatsApp (Oficial ou Diretor) antes de testar.');
    }

    const res = await sendWhatsAppTextMessage(
        c.env,
        targetPhone,
        '✅ Teste de integração GundjaTech CRM concluído com sucesso! Sua conexão WhatsApp está operando normalmente.',
        undefined,
        { bypassSyncPause: true }
    );

    if (res.ok) {
        return c.redirect(`/admin/configuracoes?success=${encodeURIComponent(`Mensagem de teste enviada via ${res.provider || 'WhatsApp'} para ${targetPhone}`)}`);
    }
    return c.redirect(`/admin/configuracoes?error=${encodeURIComponent(res.error || 'Falha ao enviar mensagem de teste no WhatsApp')}`);
});
