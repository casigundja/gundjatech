import type { FC } from 'hono/jsx';
import { AdminLayout } from './layout';

interface AdminSettingsProps {
    currentUser: any;
    settings: Record<string, string>;
    whatsappConfigured: boolean;
    whatsappSyncEnabled?: boolean;
    whatsappAiEnabled?: boolean;
    whatsappDirectorEnabled?: boolean;
    whatsappLastError?: string | null;
    webhookUrl: string;
    verifyToken: string;
    successMessage?: string | null;
    errorMessage?: string | null;
}

export const AdminSettingsView: FC<AdminSettingsProps> = ({
    currentUser,
    settings = {},
    whatsappConfigured,
    whatsappSyncEnabled = true,
    whatsappAiEnabled = true,
    whatsappDirectorEnabled = true,
    whatsappLastError = null,
    webhookUrl,
    verifyToken,
    successMessage,
    errorMessage
}) => {
    const activeProvider = settings.whatsapp_provider || 'zapi_omni';
    const isZapi = activeProvider === 'zapi_omni' || activeProvider === 'zapi';
    const isEvolution = activeProvider === 'evolution';
    const isMeta = activeProvider === 'meta';
    const socialMetaConfigured = Boolean(settings.meta_social_access_token && (settings.meta_ig_account_id || settings.meta_fb_page_id));
    let manualReelsParsed: Array<{ permalink?: string; imageUrl?: string; caption?: string }> = [];
    try {
        const parsed = JSON.parse(settings.social_manual_reels_json || '[]');
        if (Array.isArray(parsed)) manualReelsParsed = parsed;
    } catch { }

    const wa1Active = whatsappSyncEnabled;
    const wa1AiEffective = whatsappSyncEnabled && whatsappAiEnabled;
    const wa2Active = whatsappDirectorEnabled;
    const statusMeta = !whatsappConfigured
        ? { label: '● Pendente', cls: 'gt-badge-warning' }
        : wa1Active && wa1AiEffective && wa2Active
        ? { label: '● Ativo', cls: 'gt-badge-success' }
        : !wa1Active && !wa2Active
        ? { label: '● Pausado', cls: 'gt-badge-danger' }
        : { label: '● Parcial', cls: 'gt-badge-warning' };

    return (
        <AdminLayout
            title="Configurações do Sistema • Painel Administrativo GundjaTech"
            activeNav="settings"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            {/* Header Bar */}
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="min-w-0">
                    <h1 class="gt-font-display text-lg sm:text-xl font-extrabold text-white">Configurações Gerais &amp; Integrações</h1>
                    <p class="text-xs text-[#8C95AA] mt-0.5">
                        Dados institucionais da GundjaTech, números de atendimento e credenciais de WhatsApp.
                    </p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <a href="/admin/atendimento" class="gtb-ctrl-btn">
                        <span>Abrir Inbox</span>
                    </a>
                    <a href="/admin/crm-autonomo" class="gtb-ctrl-btn">
                        <span>Configurar Agente IA</span>
                        <svg class="w-3.5 h-3.5 text-[#F2C230]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    </a>
                </div>
            </div>

            {/* Main 2-column balanced grid (7fr / 5fr) */}
            <form id="gt-settings-form" action="/admin/configuracoes" method="post" data-dirty-guard="1" class="gt-crm-grid">
                {/* Coluna Esquerda: Identidade & Canais Corporativos */}
                <section class="gtb-card !p-5 flex flex-col justify-between gap-5 min-w-0">
                    <div class="space-y-5">
                        <div class="pb-3.5" style="border-bottom: 1px solid rgba(22, 116, 154, 0.14);">
                            <h2 class="gt-font-display text-sm sm:text-base font-extrabold text-white">Identidade &amp; Dados da Empresa</h2>
                            <p class="text-xs text-[#8C95AA] mt-0.5">
                                Informações exibidas em propostas comerciais, rodapé institucional e comunicações oficiais.
                            </p>
                        </div>

                        <div class="gt-grid-2 !gap-3.5">
                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Nome da Empresa</label>
                                <input
                                    type="text"
                                    name="company_name"
                                    value={settings.company_name || 'GundjaTech'}
                                    class="w-full rounded-xl px-3.5 py-2 text-xs"
                                />
                            </div>
                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">CNPJ / Documento</label>
                                <input
                                    type="text"
                                    name="company_cnpj"
                                    value={settings.company_cnpj || ''}
                                    placeholder="00.000.000/0001-00"
                                    class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Slogan / Posicionamento</label>
                            <input
                                type="text"
                                name="company_slogan"
                                value={settings.company_slogan || ''}
                                placeholder="Engenharia Digital, Sistemas Web, Cibersegurança e Operação Contínua"
                                class="w-full rounded-xl px-3.5 py-2 text-xs"
                            />
                        </div>

                        <div class="gt-grid-2 !gap-3.5">
                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">E-mail Comercial</label>
                                <input
                                    type="email"
                                    name="company_email"
                                    value={settings.company_email || 'contato@gundjatech.com'}
                                    class="w-full rounded-xl px-3.5 py-2 text-xs"
                                />
                            </div>
                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Telefone Comercial</label>
                                <input
                                    type="text"
                                    name="company_phone"
                                    value={settings.company_phone || ''}
                                    placeholder="(19) 95324-8420"
                                    class="w-full rounded-xl px-3.5 py-2 text-xs"
                                />
                            </div>
                        </div>

                        <div>
                            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Endereço / Sede</label>
                            <input
                                type="text"
                                name="company_address"
                                value={settings.company_address || ''}
                                placeholder="São Paulo - SP • Atendimento Nacional"
                                class="w-full rounded-xl px-3.5 py-2 text-xs"
                            />
                        </div>

                        {/* Subseção recolhível: Dados Bancários & PIX (Nu Empresas) */}
                        <details class="gtb-surface-box rounded-xl p-3.5">
                            <summary class="cursor-pointer flex items-center justify-between gap-3">
                                <div class="min-w-0">
                                    <div class="text-xs font-extrabold text-white">Dados Bancários &amp; PIX (Recebimentos no Portal)</div>
                                    <div class="text-[11px] text-[#8C95AA] mt-0.5 truncate">
                                        PIX <span class="font-mono">{settings.payment_pix_key || '43.209.289/0001-66'}</span> • Ag {settings.payment_bank_agency || '0001'} / Cc {settings.payment_bank_account || '16395420-4'}
                                    </div>
                                </div>
                                <span class="text-[10.5px] font-extrabold text-[#F2C230] shrink-0">EXPANDIR ▾</span>
                            </summary>

                            <div class="mt-3.5 pt-3.5 space-y-3.5 border-t border-white/10">
                                <div class="gt-grid-2 !gap-3.5">
                                    <div>
                                        <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Chave PIX Oficial (CNPJ)</label>
                                        <input
                                            type="text"
                                            name="payment_pix_key"
                                            value={settings.payment_pix_key || '43.209.289/0001-66'}
                                            class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Titular / Favorecido</label>
                                        <input
                                            type="text"
                                            name="payment_pix_holder"
                                            value={settings.payment_pix_holder || 'GUNDJATECH'}
                                            class="w-full rounded-xl px-3.5 py-2 text-xs"
                                        />
                                    </div>
                                </div>

                                <div class="gt-grid-2 !gap-3.5">
                                    <div>
                                        <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Banco (TED)</label>
                                        <input
                                            type="text"
                                            name="payment_bank_name"
                                            value={settings.payment_bank_name || '260 - Nu Pagamentos S.A. (Nu Empresas)'}
                                            class="w-full rounded-xl px-3.5 py-2 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Cidade do Beneficiário (PIX)</label>
                                        <input
                                            type="text"
                                            name="payment_pix_city"
                                            value={settings.payment_pix_city || 'SAO PAULO'}
                                            class="w-full rounded-xl px-3.5 py-2 text-xs"
                                        />
                                    </div>
                                </div>

                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Agência</label>
                                        <input
                                            type="text"
                                            name="payment_bank_agency"
                                            value={settings.payment_bank_agency || '0001'}
                                            class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Conta Corrente</label>
                                        <input
                                            type="text"
                                            name="payment_bank_account"
                                            value={settings.payment_bank_account || '16395420-4'}
                                            class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">CNPJ da Conta</label>
                                        <input
                                            type="text"
                                            name="payment_bank_cnpj"
                                            value={settings.payment_bank_cnpj || '43.209.289/0001-66'}
                                            class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        </details>

                        {/* Subseção recolhível: Números de WhatsApp */}
                        <details class="gtb-surface-box rounded-xl p-3.5">
                            <summary class="cursor-pointer flex items-center justify-between gap-3">
                                <div class="min-w-0">
                                    <div class="text-xs font-extrabold text-white">Números de Atendimento WhatsApp</div>
                                    <div class="text-[11px] text-[#8C95AA] mt-0.5 truncate">
                                        Oficial: <span class="font-mono">{settings.company_whatsapp || 'Não definido'}</span> • Diretor: <span class="font-mono">{settings.whatsapp_director_phone || 'Não definido'}</span>
                                    </div>
                                </div>
                                <span class="text-[10.5px] font-extrabold text-[#F2C230] shrink-0">EXPANDIR ▾</span>
                            </summary>

                            <div class="mt-3.5 pt-3.5 border-t border-white/10 gt-grid-2 !gap-3.5">
                                <div>
                                    <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">WhatsApp 1 · Oficial / IA</label>
                                    <input
                                        type="text"
                                        name="company_whatsapp"
                                        value={settings.company_whatsapp || ''}
                                        placeholder="5519953248420"
                                        class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                                    />
                                    <p class="text-[10.5px] text-[#8C95AA] mt-1">Somente números (DDI + DDD). Canal oficial do site e CRM IA.</p>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">WhatsApp 2 · Diretor / Humano</label>
                                    <input
                                        type="text"
                                        name="whatsapp_director_phone"
                                        value={settings.whatsapp_director_phone || ''}
                                        placeholder="5519953248420"
                                        class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                                    />
                                    <p class="text-[10.5px] text-[#8C95AA] mt-1">Recebe alertas quando cliente solicita falar com humano.</p>
                                </div>
                            </div>
                        </details>
                    </div>

                    <div class="pt-4 flex items-center justify-between gap-3 flex-wrap" style="border-top: 1px solid rgba(22, 116, 154, 0.14);">
                        <span class="text-[11px] text-[#8C95AA]">Alterações são aplicadas imediatamente em todo o painel e site.</span>
                        <button type="submit" data-loading-text="Salvando..." class="gt-btn-primary gt-btn-sm">
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M5 13l4 4L19 7"/></svg>
                            <span>Salvar Configurações</span>
                        </button>
                    </div>
                </section>

                {/* Coluna Direita: Integração WhatsApp (Z-API / Evolution / Meta) */}
                <aside class="gtb-card !p-5 flex flex-col justify-between gap-4 min-w-0">
                    <div class="space-y-4">
                        <div class="flex items-start justify-between gap-2 pb-3.5" style="border-bottom: 1px solid rgba(22, 116, 154, 0.14);">
                            <div>
                                <h2 class="gt-font-display text-sm sm:text-base font-extrabold text-white">Integração WhatsApp IA</h2>
                                <p class="text-xs text-[#8C95AA] mt-0.5">Conexão via QR Code (Z-API / Evolution) ou Meta Oficial.</p>
                            </div>
                            <span id="gt-wa-status-badge" data-configured={whatsappConfigured ? '1' : '0'} class={`gt-badge shrink-0 ${statusMeta.cls}`}>
                                {statusMeta.label}
                            </span>
                        </div>

                        {/* Controles Independentes: WhatsApp 1 e WhatsApp 2 */}
                        <div class="gtb-surface-box rounded-xl overflow-hidden">
                            <label class="flex items-center justify-between gap-3 px-3.5 py-2.5 cursor-pointer" style="border-bottom: 1px solid rgba(22, 116, 154, 0.14);">
                                <div class="min-w-0">
                                    <div class="text-xs font-bold text-white leading-tight">WhatsApp 1 · Atendimento Oficial (Recebimento)</div>
                                    <div id="gt-wa-sync-desc" class="text-[11px] text-[#8C95AA] mt-0.5">
                                        {whatsappSyncEnabled ? 'Ativo — recebendo mensagens de clientes no número oficial' : 'Pausado — recebimento no WhatsApp oficial desativado'}
                                    </div>
                                </div>
                                <input id="gt-wa-sync-chk" type="checkbox" name="whatsapp_sync_enabled" value="1" checked={whatsappSyncEnabled} onchange="window.GT_SyncWaStatus && window.GT_SyncWaStatus()" class="gt-switch shrink-0" />
                            </label>

                            <label id="gt-wa-ai-row" class="flex items-center justify-between gap-3 px-3.5 py-2.5 cursor-pointer" style={`border-bottom: 1px solid rgba(22, 116, 154, 0.14); opacity: ${whatsappSyncEnabled ? '1' : '0.68'};`}>
                                <div class="min-w-0">
                                    <div class="text-xs font-bold text-white leading-tight">WhatsApp 1 · Atendimento Automático (IA)</div>
                                    <div id="gt-wa-ai-desc" class="text-[11px] text-[#8C95AA] mt-0.5">
                                        {!whatsappSyncEnabled
                                            ? 'Em espera — ative o Recebimento do WhatsApp 1 para a IA responder'
                                            : whatsappAiEnabled
                                            ? 'Ativo — IA responde e interage com clientes no WhatsApp 1'
                                            : 'Pausado — conversas entram no Inbox para resposta humana'}
                                    </div>
                                </div>
                                <input id="gt-wa-ai-chk" type="checkbox" name="whatsapp_ai_enabled" value="1" checked={whatsappAiEnabled} onchange="window.GT_SyncWaStatus && window.GT_SyncWaStatus()" class="gt-switch shrink-0" />
                            </label>

                            <label class="flex items-center justify-between gap-3 px-3.5 py-2.5 cursor-pointer">
                                <div class="min-w-0">
                                    <div class="text-xs font-bold text-white leading-tight">WhatsApp 2 · Atendimento Direto do Diretor</div>
                                    <div id="gt-wa-dir-desc" class="text-[11px] text-[#8C95AA] mt-0.5">
                                        {whatsappDirectorEnabled ? 'Ativo — recebe solicitações de atendimento humano (Site e WhatsApp 1)' : 'Pausado — solicitações de atendimento humano ficam apenas no Inbox'}
                                    </div>
                                </div>
                                <input id="gt-wa-dir-chk" type="checkbox" name="whatsapp_director_enabled" value="1" checked={whatsappDirectorEnabled} onchange="window.GT_SyncWaStatus && window.GT_SyncWaStatus()" class="gt-switch shrink-0" />
                            </label>
                        </div>

                        {whatsappLastError && whatsappSyncEnabled && (
                            <div class="rounded-xl p-3 bg-red-500/10 border border-red-400/30 text-[11px] text-red-300 leading-relaxed break-words">
                                <strong class="block text-[10px] uppercase tracking-wider mb-0.5">Último erro de envio:</strong>
                                {whatsappLastError}
                            </div>
                        )}

                        {/* Credenciais Técnicas & Webhook recolhíveis */}
                        <details class="gtb-surface-box rounded-xl p-3.5">
                            <summary class="cursor-pointer flex items-center justify-between gap-3">
                                <div class="min-w-0">
                                    <div class="text-xs font-extrabold text-white">Credenciais Técnicas &amp; Webhook</div>
                                    <div class="text-[11px] text-[#8C95AA] mt-0.5 truncate">
                                        {isMeta ? 'Meta Cloud API' : isEvolution ? 'Evolution API v2' : 'Z-API Omni'} • {whatsappConfigured ? 'Credenciais salvas ✓' : 'Aguardando configuração'}
                                    </div>
                                </div>
                                <span class="text-[10.5px] font-extrabold text-[#F2C230] shrink-0">EXPANDIR ▾</span>
                            </summary>

                            <div class="mt-3.5 pt-3.5 space-y-3.5 border-t border-white/10">
                                {/* Webhook URL com botão Copiar */}
                                <div class="rounded-xl p-3 space-y-2.5 text-xs border border-white/10">
                                    <div class="flex items-start justify-between gap-2">
                                        <div class="min-w-0">
                                            <div class="text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">URL do Webhook (cole no seu provedor)</div>
                                            <div id="gt-wa-webhook-url" class="font-mono text-[11px] text-white break-all mt-0.5">{webhookUrl}</div>
                                        </div>
                                        <button
                                            type="button"
                                            onclick="var el=document.getElementById('gt-wa-webhook-url');if(el&&navigator.clipboard){navigator.clipboard.writeText(el.textContent.trim());this.textContent='Copiado!';var b=this;setTimeout(function(){b.textContent='Copiar';},1800);}"
                                            class="gt-btn-outline gt-btn-xs shrink-0"
                                        >
                                            Copiar
                                        </button>
                                    </div>
                                    <div data-wa-meta-token style={`display: ${isMeta ? 'block' : 'none'}; border-top: 1px solid rgba(22, 116, 154, 0.14); padding-top: 8px;`}>
                                        <div class="text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Token de Verificação (Meta)</div>
                                        <div class="font-mono text-[11px] text-[#F2C230] font-bold mt-0.5">{verifyToken}</div>
                                    </div>
                                </div>

                                <div>
                                    <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Provedor WhatsApp Ativo</label>
                                    <select
                                        id="gt-wa-provider-select"
                                        name="whatsapp_provider"
                                        onchange="var v=this.value==='zapi_omni'?'zapi':this.value;document.querySelectorAll('[data-wa-pane]').forEach(function(el){el.style.display=el.getAttribute('data-wa-pane')===v?'block':'none';});var mt=document.querySelector('[data-wa-meta-token]');if(mt){mt.style.display=this.value==='meta'?'block':'none';}"
                                        class="w-full rounded-xl px-3.5 py-2 text-xs"
                                    >
                                        <option value="zapi_omni" selected={activeProvider === 'zapi_omni'}>Z-API Omni (QR Code — api.omni.z-api.io)</option>
                                        <option value="zapi" selected={activeProvider === 'zapi'}>Z-API Clássico (QR Code — api.z-api.io)</option>
                                        <option value="evolution" selected={activeProvider === 'evolution'}>Evolution API v2 (QR Code / Self-Hosted)</option>
                                        <option value="meta" selected={activeProvider === 'meta'}>Meta WhatsApp Cloud API (Oficial)</option>
                                    </select>
                                </div>

                                {/* Campos Z-API / Z-API Omni */}
                                <div data-wa-pane="zapi" style={`display: ${isZapi ? 'block' : 'none'};`} class="space-y-3">
                                    <div>
                                        <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">ID do Canal / Instance ID</label>
                                        <input
                                            type="text"
                                            name="whatsapp_zapi_instance_id"
                                            value={settings.whatsapp_zapi_instance_id || ''}
                                            placeholder="Ex: 01A20068C3327BE580..."
                                            class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                                        />
                                    </div>
                                    <div>
                                        <div class="flex items-center justify-between gap-2 mb-1">
                                            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Token do Canal / Instância</label>
                                            {settings.has_zapi_token && <span class="gt-badge gt-badge-success text-[10px]">✓ Salvo</span>}
                                        </div>
                                        <input
                                            type="password"
                                            name="whatsapp_zapi_token"
                                            autocomplete="new-password"
                                            readonly
                                            onfocus="this.removeAttribute('readonly');"
                                            placeholder={settings.has_zapi_token ? '•••••••• (deixe vazio para manter)' : 'Ex: C8CC3D...'}
                                            class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                                        />
                                    </div>
                                    <div>
                                        <div class="flex items-center justify-between gap-2 mb-1">
                                            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Secret Key / Client-Token</label>
                                            {settings.has_zapi_client_token && <span class="gt-badge gt-badge-success text-[10px]">✓ Salva</span>}
                                        </div>
                                        <input
                                            type="password"
                                            name="whatsapp_zapi_client_token"
                                            autocomplete="new-password"
                                            readonly
                                            onfocus="this.removeAttribute('readonly');"
                                            placeholder={settings.has_zapi_client_token ? '•••••••• (deixe vazio para manter)' : 'Secret Key do Workspace (Segurança)'}
                                            class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Campos Evolution API */}
                                <div data-wa-pane="evolution" style={`display: ${isEvolution ? 'block' : 'none'};`} class="space-y-3">
                                    <div>
                                        <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">URL da Evolution API</label>
                                        <input
                                            type="url"
                                            name="whatsapp_evolution_url"
                                            value={settings.whatsapp_evolution_url || ''}
                                            placeholder="https://evo.seudominio.com"
                                            class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Nome da Instância</label>
                                        <input
                                            type="text"
                                            name="whatsapp_evolution_instance"
                                            value={settings.whatsapp_evolution_instance || ''}
                                            placeholder="Ex: gundjatech"
                                            class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                                        />
                                    </div>
                                    <div>
                                        <div class="flex items-center justify-between gap-2 mb-1">
                                            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Evolution API Key</label>
                                            {settings.has_evolution_key && <span class="gt-badge gt-badge-success text-[10px]">✓ Salva</span>}
                                        </div>
                                        <input
                                            type="password"
                                            name="whatsapp_evolution_api_key"
                                            autocomplete="new-password"
                                            readonly
                                            onfocus="this.removeAttribute('readonly');"
                                            placeholder={settings.has_evolution_key ? '•••••••• (deixe vazio para manter)' : 'Cole a API Key'}
                                            class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Campos Meta Cloud API */}
                                <div data-wa-pane="meta" style={`display: ${isMeta ? 'block' : 'none'};`} class="space-y-3">
                                    <div>
                                        <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Meta Phone Number ID</label>
                                        <input
                                            type="text"
                                            name="whatsapp_phone_number_id"
                                            value={settings.whatsapp_phone_number_id || ''}
                                            placeholder="Ex: 1452542717940715"
                                            class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Meta Access Token</label>
                                        <input
                                            type="password"
                                            name="whatsapp_access_token"
                                            autocomplete="new-password"
                                            readonly
                                            onfocus="this.removeAttribute('readonly');"
                                            placeholder="EAA... (deixe vazio para manter)"
                                            class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        </details>
                    </div>

                    {/* Rodapé de teste rápido WhatsApp */}
                    <div class="pt-3.5" style="border-top: 1px solid rgba(22, 116, 154, 0.14);">
                        <button
                            type="button"
                            onclick="var f=document.getElementById('gt-test-wa-form');if(f)f.submit();"
                            class="gt-btn-outline gt-btn-sm w-full justify-center"
                        >
                            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                            <span>Testar Envio WhatsApp</span>
                        </button>
                    </div>
                </aside>

                {/* Seção Full-Width: Sincronização Instagram Reels & Facebook em Tempo Real */}
                <section class="gtb-card !p-5 space-y-4 min-w-0" style="grid-column: 1 / -1;">
                    <div class="flex flex-wrap items-start justify-between gap-3 pb-3.5" style="border-bottom: 1px solid rgba(22, 116, 154, 0.14);">
                        <div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <h2 class="gt-font-display text-sm sm:text-base font-extrabold text-white">
                                    Sincronização em Tempo Real • Instagram Reels &amp; Facebook
                                </h2>
                                <span class={`gt-badge ${socialMetaConfigured ? 'gt-badge-success' : manualReelsParsed.length > 0 ? 'gt-badge-info' : 'gt-badge-warning'}`}>
                                    {socialMetaConfigured ? '● Meta API Ativa' : manualReelsParsed.length > 0 ? `● ${manualReelsParsed.length} Reels Manuais` : '● Vitrine Padrão'}
                                </span>
                            </div>
                            <p class="text-xs text-[#8C95AA] mt-1">
                                Conecte sua conta profissional da Meta para exibir automaticamente os últimos 4 Reels e posts na seção <strong>Acompanhe a GundjaTech</strong> da Home (cache automático de 15 min no Edge).
                            </p>
                        </div>

                        <button
                            type="button"
                            onclick="var f=document.getElementById('gt-sync-social-form');if(f)f.submit();"
                            class="gt-btn-outline gt-btn-sm shrink-0"
                        >
                            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                                <path d="M16 16h5v5" />
                            </svg>
                            <span>Sincronizar Agora</span>
                        </button>
                    </div>

                    <details class="gtb-surface-box rounded-xl p-3.5">
                        <summary class="cursor-pointer flex items-center justify-between gap-3">
                            <div class="min-w-0">
                                <div class="text-xs font-extrabold text-white">Credenciais da Meta Graph API (Instagram &amp; Facebook)</div>
                                <div class="text-[11px] text-[#8C95AA] mt-0.5 truncate">
                                    {settings.meta_ig_account_id ? `IG ${settings.meta_ig_account_id}` : 'IG não configurado'} • {settings.meta_social_access_token ? 'Token permanente salvo ✓' : 'Token pendente'}
                                </div>
                            </div>
                            <span class="text-[10.5px] font-extrabold text-[#F2C230] shrink-0">EXPANDIR ▾</span>
                        </summary>
                        <div class="mt-3.5 pt-3.5 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-3.5">
                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Instagram Business Account ID</label>
                                <input
                                    type="text"
                                    name="meta_ig_account_id"
                                    value={settings.meta_ig_account_id || ''}
                                    placeholder="Ex: 17841400000000000"
                                    class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                                />
                                <p class="text-[10.5px] text-[#8C95AA] mt-1">ID da conta @gundjatech no Meta Business Suite.</p>
                            </div>
                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Facebook Page ID (Opcional)</label>
                                <input
                                    type="text"
                                    name="meta_fb_page_id"
                                    value={settings.meta_fb_page_id || ''}
                                    placeholder="Ex: 100089000000000"
                                    class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                                />
                                <p class="text-[10.5px] text-[#8C95AA] mt-1">Complementa os cards com posts da Página do Facebook.</p>
                            </div>
                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Meta Graph Access Token</label>
                                <input
                                    type="password"
                                    name="meta_social_access_token"
                                    autocomplete="new-password"
                                    readonly
                                    onfocus="this.removeAttribute('readonly');"
                                    placeholder={settings.meta_social_access_token ? 'Token configurado (deixe vazio para manter)' : 'EAA... (System User Token)'}
                                    class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                                />
                                <p class="text-[10.5px] text-[#8C95AA] mt-1">Permissões: <span class="font-mono">instagram_basic</span>, <span class="font-mono">pages_show_list</span>.</p>
                            </div>
                        </div>
                    </details>

                    {/* Curadoria Manual Opcional (Fallback imediato para fixar até 4 Reels) */}
                    <details class="gtb-surface-box rounded-xl p-3.5">
                        <summary class="cursor-pointer text-xs font-bold text-white flex items-center justify-between gap-2">
                            <span>Curadoria Manual de Reels (opcional — substitui a vitrine padrão enquanto o token Meta não estiver ativo)</span>
                            <span class="text-[10.5px] font-extrabold text-[#F2C230]">EXPANDIR ▾</span>
                        </summary>
                        <div class="mt-3.5 space-y-3">
                            {[1, 2, 3, 4].map((idx) => {
                                const item = manualReelsParsed[idx - 1] || {};
                                return (
                                    <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2.5 border-t border-white/5">
                                        <div>
                                            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Reel #{idx} · Link do Instagram/Facebook</label>
                                            <input
                                                type="url"
                                                name={`social_reel_url_${idx}`}
                                                value={item.permalink || ''}
                                                placeholder="https://www.instagram.com/reel/..."
                                                class="w-full rounded-xl px-3 py-2 text-xs font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">URL da Capa (Imagem)</label>
                                            <input
                                                type="url"
                                                name={`social_reel_cover_${idx}`}
                                                value={item.imageUrl || ''}
                                                placeholder="https://... (opcional)"
                                                class="w-full rounded-xl px-3 py-2 text-xs font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Legenda / Título Curto</label>
                                            <input
                                                type="text"
                                                name={`social_reel_caption_${idx}`}
                                                value={item.caption || ''}
                                                placeholder="Ex: Bastidores do lançamento..."
                                                class="w-full rounded-xl px-3 py-2 text-xs"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </details>

                    <div class="flex items-center justify-end gap-3 pt-1">
                        <button type="submit" data-loading-text="Salvando..." class="gt-btn-primary gt-btn-sm">
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M5 13l4 4L19 7"/></svg>
                            <span>Salvar Integração de Redes</span>
                        </button>
                    </div>
                </section>
            </form>

            {/* Forms auxiliares isolados para testes/sincronização sem disparar dirty-guard */}
            <form id="gt-test-wa-form" action="/admin/configuracoes/testar-whatsapp" method="post" class="hidden"></form>
            <form id="gt-sync-social-form" action="/admin/configuracoes/sincronizar-redes" method="post" class="hidden"></form>

            <script dangerouslySetInnerHTML={{ __html: `
                window.GT_SyncWaStatus = function () {
                    var syncChk = document.getElementById('gt-wa-sync-chk');
                    var aiChk = document.getElementById('gt-wa-ai-chk');
                    var dirChk = document.getElementById('gt-wa-dir-chk');
                    var badge = document.getElementById('gt-wa-status-badge');
                    var syncDesc = document.getElementById('gt-wa-sync-desc');
                    var aiDesc = document.getElementById('gt-wa-ai-desc');
                    var aiRow = document.getElementById('gt-wa-ai-row');
                    var dirDesc = document.getElementById('gt-wa-dir-desc');
                    if (!syncChk || !aiChk || !dirChk || !badge) return;

                    var syncOn = !!syncChk.checked;
                    var aiOn = !!aiChk.checked;
                    var dirOn = !!dirChk.checked;
                    var configured = badge.getAttribute('data-configured') === '1';

                    if (syncDesc) {
                        syncDesc.textContent = syncOn
                            ? 'Ativo — recebendo mensagens de clientes no número oficial'
                            : 'Pausado — recebimento no WhatsApp oficial desativado';
                    }
                    if (aiRow) aiRow.style.opacity = syncOn ? '1' : '0.68';
                    if (aiDesc) {
                        aiDesc.textContent = !syncOn
                            ? 'Em espera — ative o Recebimento do WhatsApp 1 para a IA responder'
                            : aiOn
                            ? 'Ativo — IA responde e interage com clientes no WhatsApp 1'
                            : 'Pausado — conversas entram no Inbox para resposta humana';
                    }
                    if (dirDesc) {
                        dirDesc.textContent = dirOn
                            ? 'Ativo — recebe solicitações de atendimento humano (Site e WhatsApp 1)'
                            : 'Pausado — solicitações de atendimento humano ficam apenas no Inbox';
                    }

                    badge.classList.remove('gt-badge-success', 'gt-badge-warning', 'gt-badge-danger');
                    if (!configured) {
                        badge.textContent = '● Pendente';
                        badge.classList.add('gt-badge-warning');
                    } else if (syncOn && aiOn && dirOn) {
                        badge.textContent = '● Ativo';
                        badge.classList.add('gt-badge-success');
                    } else if (!syncOn && !dirOn) {
                        badge.textContent = '● Pausado';
                        badge.classList.add('gt-badge-danger');
                    } else {
                        badge.textContent = '● Parcial';
                        badge.classList.add('gt-badge-warning');
                    }
                };
            ` }} />
        </AdminLayout>
    );
};
