import { Env } from '../types/env';

export interface SocialFeedItem {
    id: string;
    platform: 'instagram' | 'facebook';
    mediaType: 'REEL' | 'VIDEO' | 'IMAGE' | 'CAROUSEL';
    caption: string;
    imageUrl: string;
    videoUrl?: string;
    permalink: string;
    timestamp: string;
}

export interface SocialFeedResult {
    items: SocialFeedItem[];
    source: 'meta_api' | 'manual' | 'fallback';
    syncedAt: string;
    error?: string | null;
}

const CACHE_KEY = 'gt:social_feed:v1';
const CACHE_TTL_SECONDS = 900; // 15 minutos

function escapeHtml(str: unknown): string {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function truncateText(text: string, maxLen = 92): string {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= maxLen) return clean;
    return `${clean.slice(0, maxLen - 1).trimEnd()}…`;
}

async function loadSocialSettings(db?: D1Database): Promise<Record<string, string>> {
    const map: Record<string, string> = {};
    if (!db) return map;
    try {
        const res = await db.prepare(
            `SELECT key, value FROM system_settings
             WHERE key IN (
               'meta_ig_account_id',
               'meta_fb_page_id',
               'meta_social_access_token',
               'social_manual_reels_json'
             )`
        ).all<{ key: string; value: string }>();
        for (const row of res.results || []) {
            map[row.key] = String(row.value || '').trim();
        }
    } catch { }
    return map;
}

function parseManualReels(rawJson: string): SocialFeedItem[] {
    if (!rawJson) return [];
    try {
        const parsed = JSON.parse(rawJson);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((item: any) => item && typeof item.permalink === 'string' && item.permalink.trim().startsWith('http'))
            .slice(0, 4)
            .map((item: any, idx: number) => ({
                id: `manual-${idx + 1}`,
                platform: item.platform === 'facebook' ? 'facebook' : 'instagram',
                mediaType: item.mediaType === 'IMAGE' ? 'IMAGE' : 'REEL',
                caption: String(item.caption || 'Confira este conteúdo oficial da GundjaTech').trim(),
                imageUrl: String(item.imageUrl || '').trim(),
                permalink: String(item.permalink).trim(),
                timestamp: new Date().toISOString()
            }));
    } catch {
        return [];
    }
}

async function fetchFromMetaGraphApi(
    igAccountId: string,
    fbPageId: string,
    accessToken: string
): Promise<{ items: SocialFeedItem[]; error?: string }> {
    const items: SocialFeedItem[] = [];
    const errors: string[] = [];

    // 1. Instagram Graph API (Reels + Posts)
    if (igAccountId && accessToken) {
        try {
            const igUrl =
                `https://graph.facebook.com/v21.0/${encodeURIComponent(igAccountId)}/media` +
                `?fields=id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp` +
                `&limit=8&access_token=${encodeURIComponent(accessToken)}`;

            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(igUrl, { signal: controller.signal });
            clearTimeout(timer);

            const data: any = await res.json().catch(() => ({}));
            if (!res.ok) {
                errors.push(`Instagram API: ${data?.error?.message || `HTTP ${res.status}`}`);
            } else if (Array.isArray(data?.data)) {
                // Prioriza Reels / Vídeos, mantendo ordem cronológica recente
                const sorted = [...data.data].sort((a: any, b: any) => {
                    const aReel = a.media_product_type === 'REELS' || a.media_type === 'VIDEO' ? 1 : 0;
                    const bReel = b.media_product_type === 'REELS' || b.media_type === 'VIDEO' ? 1 : 0;
                    if (aReel !== bReel) return bReel - aReel;
                    return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
                });

                for (const m of sorted) {
                    const imageUrl = m.thumbnail_url || (m.media_type !== 'VIDEO' ? m.media_url : '') || '';
                    if (!m.permalink) continue;
                    items.push({
                        id: String(m.id),
                        platform: 'instagram',
                        mediaType: m.media_product_type === 'REELS' ? 'REEL' : m.media_type === 'VIDEO' ? 'VIDEO' : m.media_type === 'CAROUSEL_ALBUM' ? 'CAROUSEL' : 'IMAGE',
                        caption: String(m.caption || 'Novo conteúdo oficial da GundjaTech no Instagram').trim(),
                        imageUrl,
                        videoUrl: m.media_type === 'VIDEO' ? String(m.media_url || '') : undefined,
                        permalink: String(m.permalink),
                        timestamp: String(m.timestamp || new Date().toISOString())
                    });
                    if (items.length >= 4) break;
                }
            }
        } catch (err: any) {
            errors.push(`Instagram API: ${err?.message || 'Timeout ou erro de rede'}`);
        }
    }

    // 2. Facebook Page Posts API (complementa até 4 cards se configurado)
    if (fbPageId && accessToken && items.length < 4) {
        try {
            const fbUrl =
                `https://graph.facebook.com/v21.0/${encodeURIComponent(fbPageId)}/posts` +
                `?fields=id,message,full_picture,permalink_url,created_time` +
                `&limit=6&access_token=${encodeURIComponent(accessToken)}`;

            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(fbUrl, { signal: controller.signal });
            clearTimeout(timer);

            const data: any = await res.json().catch(() => ({}));
            if (!res.ok) {
                errors.push(`Facebook API: ${data?.error?.message || `HTTP ${res.status}`}`);
            } else if (Array.isArray(data?.data)) {
                for (const p of data.data) {
                    if (!p.permalink_url) continue;
                    items.push({
                        id: String(p.id),
                        platform: 'facebook',
                        mediaType: 'IMAGE',
                        caption: String(p.message || 'Publicação oficial da GundjaTech no Facebook').trim(),
                        imageUrl: String(p.full_picture || ''),
                        permalink: String(p.permalink_url),
                        timestamp: String(p.created_time || new Date().toISOString())
                    });
                    if (items.length >= 4) break;
                }
            }
        } catch (err: any) {
            errors.push(`Facebook API: ${err?.message || 'Timeout ou erro de rede'}`);
        }
    }

    return {
        items: items.slice(0, 4),
        error: errors.length > 0 ? errors.join(' | ') : undefined
    };
}

export async function getSocialFeed(
    env: Env,
    options?: { forceRefresh?: boolean }
): Promise<SocialFeedResult> {
    const forceRefresh = Boolean(options?.forceRefresh);

    // 1. Tenta cache KV (evita latência e rate limit da Meta)
    if (!forceRefresh && env?.KV_CACHE) {
        try {
            const cached = await env.KV_CACHE.get(CACHE_KEY, 'json') as SocialFeedResult | null;
            if (cached && Array.isArray(cached.items)) {
                return cached;
            }
        } catch { }
    }

    const settings = await loadSocialSettings(env?.DB);
    const igAccountId = settings.meta_ig_account_id || '';
    const fbPageId = settings.meta_fb_page_id || '';
    const accessToken = settings.meta_social_access_token || '';

    let result: SocialFeedResult = {
        items: [],
        source: 'fallback',
        syncedAt: new Date().toISOString(),
        error: null
    };

    // 2. Sincronização automática via Meta Graph API
    if (accessToken && (igAccountId || fbPageId)) {
        const metaRes = await fetchFromMetaGraphApi(igAccountId, fbPageId, accessToken);
        if (metaRes.items.length > 0) {
            result = {
                items: metaRes.items,
                source: 'meta_api',
                syncedAt: new Date().toISOString(),
                error: metaRes.error || null
            };
        } else {
            result.error = metaRes.error || 'Nenhuma publicação retornada pela API da Meta.';
        }
    }

    // 3. Fallback para curadoria manual se configurada
    if (result.items.length === 0 && settings.social_manual_reels_json) {
        const manualItems = parseManualReels(settings.social_manual_reels_json);
        if (manualItems.length > 0) {
            result = {
                items: manualItems,
                source: 'manual',
                syncedAt: new Date().toISOString(),
                error: result.error || null
            };
        }
    }

    // Salva no KV_CACHE por 15 minutos
    if (env?.KV_CACHE) {
        try {
            await env.KV_CACHE.put(CACHE_KEY, JSON.stringify(result), { expirationTtl: CACHE_TTL_SECONDS });
        } catch { }
    }

    return result;
}

export async function clearSocialFeedCache(env: Env): Promise<void> {
    if (env?.KV_CACHE) {
        try {
            await env.KV_CACHE.delete(CACHE_KEY);
        } catch { }
    }
}

export function renderSocialFeedCardsHtml(items: SocialFeedItem[]): string | null {
    if (!items || items.length === 0) return null;

    return items
        .slice(0, 4)
        .map((item, idx) => {
            const isVideo = item.mediaType === 'REEL' || item.mediaType === 'VIDEO';
            const badgeLabel = item.platform === 'facebook' ? 'Facebook' : isVideo ? 'Reels' : 'Instagram';
            const handleLabel = item.platform === 'facebook' ? 'GundjaTech · Facebook' : '@gundjatech';
            const safeCaption = escapeHtml(truncateText(item.caption, 88));
            const safeUrl = escapeHtml(item.permalink);
            const hasVideo = Boolean(isVideo && item.videoUrl && item.videoUrl.startsWith('http'));
            const hasCover = Boolean(item.imageUrl && item.imageUrl.startsWith('http'));
            const hasMedia = hasVideo || hasCover;
            const cardVariant = hasMedia ? 'gt-reel-card--media' : `gt-reel-card--${(idx % 4) + 1}`;

            const mediaTag = hasVideo
                ? `<video class="gt-reel-cover" src="${escapeHtml(item.videoUrl)}"${hasCover ? ` poster="${escapeHtml(item.imageUrl)}"` : ''} autoplay muted loop playsinline webkit-playsinline preload="metadata" aria-hidden="true"></video><div class="gt-reel-scrim" aria-hidden="true"></div>`
                : hasCover
                ? `<img class="gt-reel-cover" src="${escapeHtml(item.imageUrl)}" alt="${safeCaption}" loading="lazy"><div class="gt-reel-scrim" aria-hidden="true"></div>`
                : '';

            return `<a class="gt-reel-card ${cardVariant}" href="${safeUrl}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(badgeLabel)} da GundjaTech: ${safeCaption}">
        ${mediaTag}
        <div class="gt-reel-top">
          <span class="gt-reel-brand"><img src="/img/favicon.svg?v=gt-icon4" alt="GundjaTech"></span>
        </div>
        <div class="gt-reel-body">
          ${hasMedia ? '' : `<span class="gt-reel-kicker">${escapeHtml(handleLabel)}</span>`}
          <p class="${hasMedia ? 'gt-reel-caption' : 'gt-reel-title'}">${safeCaption}</p>
        </div>
        <div class="gt-reel-foot">
          <span>${isVideo ? 'Assistir Reel' : 'Ver publicação'}</span>
          <span class="gt-reel-play" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg></span>
        </div>
      </a>`;
        })
        .join('\n');
}
