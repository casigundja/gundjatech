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

                        {/* Subseção: Números de WhatsApp */}
                        <div class="pt-4 space-y-3.5" style="border-top: 1px solid rgba(22, 116, 154, 0.14);">
                            <div>
                                <h3 class="gt-font-display text-xs font-extrabold uppercase tracking-wider text-[#16749A]">Números de Atendimento WhatsApp</h3>
                                <p class="text-[11px] text-[#8C95AA] mt-0.5">Configure os números usados no atendimento IA e nos alertas de handoff humano.</p>
                            </div>

                            <div class="gt-grid-2 !gap-3.5">
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
                        </div>
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

                        {/* Webhook URL com botão Copiar */}
                        <div class="gtb-surface-box rounded-xl p-3.5 space-y-2.5 text-xs">
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

                        {/* Campos Z-API / Z-API Omni (protegidos contra autofill de senha do navegador) */}
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
            </form>

            {/* Form auxiliar isolado para testar envio WhatsApp sem disparar dirty-guard */}
            <form id="gt-test-wa-form" action="/admin/configuracoes/testar-whatsapp" method="post" class="hidden"></form>

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
