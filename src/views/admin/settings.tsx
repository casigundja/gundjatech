import type { FC } from 'hono/jsx';
import { AdminLayout } from './layout';

interface AdminSettingsProps {
    currentUser: any;
    settings: Record<string, string>;
    whatsappConfigured: boolean;
    webhookUrl: string;
    verifyToken: string;
    successMessage?: string | null;
    errorMessage?: string | null;
}

export const AdminSettingsView: FC<AdminSettingsProps> = ({
    currentUser,
    settings = {},
    whatsappConfigured,
    webhookUrl,
    verifyToken,
    successMessage,
    errorMessage
}) => {
    return (
        <AdminLayout
            title="Configurações do Sistema • Painel Administrativo GundjaTech"
            activeNav="settings"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header !mb-0">
                <div>
                    <h1 class="gt-font-display text-xl sm:text-2xl font-extrabold text-white">Configurações Gerais &amp; Integrações</h1>
                    <p class="text-xs sm:text-sm text-[#8C95AA] mt-1">
                        Dados institucionais da GundjaTech, canais de atendimento e credenciais do ecossistema Cloudflare.
                    </p>
                </div>
                <div class="flex items-center gap-2 flex-wrap">
                    <a href="/admin/crm-autonomo" class="gtb-ctrl-btn">
                        <span>Configurar Agente IA</span>
                        <svg class="w-3.5 h-3.5 text-[#F2C230]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    </a>
                </div>
            </div>

            <form action="/admin/configuracoes" method="post" class="gt-grid-detail items-start">
                {/* Coluna Principal: Dados da Empresa */}
                <section class="gtb-card space-y-5 min-w-0">
                    <div>
                        <h2 class="gt-font-display text-base font-extrabold text-white">Identidade &amp; Dados da Empresa</h2>
                        <p class="text-xs text-[#8C95AA] mt-0.5">
                            Informações exibidas em propostas comerciais, rodapé institucional e comunicações oficiais.
                        </p>
                    </div>

                    <div class="gt-grid-2">
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Nome da Empresa</label>
                            <input
                                type="text"
                                name="company_name"
                                value={settings.company_name || 'GundjaTech'}
                                class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                            />
                        </div>
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">CNPJ / Documento</label>
                            <input
                                type="text"
                                name="company_cnpj"
                                value={settings.company_cnpj || ''}
                                placeholder="00.000.000/0001-00"
                                class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                            />
                        </div>
                    </div>

                    <div>
                        <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Slogan / Posicionamento</label>
                        <input
                            type="text"
                            name="company_slogan"
                            value={settings.company_slogan || ''}
                            placeholder="Engenharia Digital, Sistemas Web, Cibersegurança e Operação Contínua"
                            class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                        />
                    </div>

                    <div class="gt-grid-2">
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">E-mail Comercial</label>
                            <input
                                type="email"
                                name="company_email"
                                value={settings.company_email || 'contato@gundjatech.com'}
                                class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                            />
                        </div>
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Telefone Comercial</label>
                            <input
                                type="text"
                                name="company_phone"
                                value={settings.company_phone || ''}
                                placeholder="(19) 95324-8420"
                                class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                            />
                        </div>
                    </div>

                    <div class="gt-grid-2">
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">WhatsApp Oficial (somente números)</label>
                            <input
                                type="text"
                                name="company_whatsapp"
                                value={settings.company_whatsapp || ''}
                                placeholder="5519953248420"
                                class="w-full rounded-xl px-3.5 py-2.5 text-[13px] font-mono"
                            />
                        </div>
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Endereço / Sede</label>
                            <input
                                type="text"
                                name="company_address"
                                value={settings.company_address || ''}
                                placeholder="São Paulo - SP • Atendimento Nacional"
                                class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                            />
                        </div>
                    </div>

                    <div class="pt-2">
                        <button type="submit" class="gt-btn-primary py-3 px-6 text-[13px]">
                            Salvar Configurações Gerais
                        </button>
                    </div>
                </section>

                {/* Coluna Lateral: Integração WhatsApp (Z-API / Evolution / Meta) */}
                <aside class="gtb-card gtb-kpi-gold space-y-4 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                        <div>
                            <h2 class="gt-font-display text-base font-extrabold text-white">Integração WhatsApp IA</h2>
                            <p class="text-xs text-[#8C95AA] mt-0.5">Conecte via QR Code (Z-API / Evolution) ou Meta Oficial.</p>
                        </div>
                        <span class={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            whatsappConfigured
                                ? 'bg-emerald-500/15 text-[#6EE7B7]'
                                : 'bg-amber-500/15 text-amber-300'
                        }`}>
                            {whatsappConfigured ? 'Conectado' : 'Pendente'}
                        </span>
                    </div>

                    <div class="gtb-surface-box rounded-xl p-3.5 space-y-2 text-xs">
                        <div>
                            <div class="text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">URL do Webhook (cole no seu provedor)</div>
                            <div class="font-mono text-[11.5px] text-white break-all mt-0.5">{webhookUrl}</div>
                        </div>
                        <div class="pt-2 border-t border-white/10">
                            <div class="text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Token de Verificação (Meta)</div>
                            <div class="font-mono text-[11.5px] text-[#F2C230] font-bold mt-0.5">{verifyToken}</div>
                        </div>
                    </div>

                    <div>
                        <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Provedor WhatsApp Ativo</label>
                        <select
                            id="gt-wa-provider-select"
                            name="whatsapp_provider"
                            onchange="document.querySelectorAll('[data-wa-pane]').forEach(function(el){el.style.display=el.getAttribute('data-wa-pane')===this.value?'block':'none';}.bind(this))"
                            class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                        >
                            <option value="zapi" selected={(settings.whatsapp_provider || 'zapi') === 'zapi'}>Z-API (QR Code — Recomendado / Rápido)</option>
                            <option value="evolution" selected={settings.whatsapp_provider === 'evolution'}>Evolution API v2 (QR Code / Self-Hosted)</option>
                            <option value="meta" selected={settings.whatsapp_provider === 'meta'}>Meta WhatsApp Cloud API (Oficial)</option>
                        </select>
                    </div>

                    {/* Campos Z-API */}
                    <div data-wa-pane="zapi" style={`display: ${(settings.whatsapp_provider || 'zapi') === 'zapi' ? 'block' : 'none'};`} class="space-y-3">
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Z-API Instance ID</label>
                            <input
                                type="text"
                                name="whatsapp_zapi_instance_id"
                                value={settings.whatsapp_zapi_instance_id || ''}
                                placeholder="Ex: 3D8A9F..."
                                class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                            />
                        </div>
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Z-API Token da Instância</label>
                            <input
                                type="password"
                                name="whatsapp_zapi_token"
                                autocomplete="off"
                                placeholder={settings.has_zapi_token ? '•••••••• (salvo — deixe vazio para manter)' : 'Cole o Token da instância'}
                                class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                            />
                        </div>
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Z-API Client-Token (Segurança da Conta)</label>
                            <input
                                type="password"
                                name="whatsapp_zapi_client_token"
                                autocomplete="off"
                                placeholder={settings.has_zapi_client_token ? '•••••••• (salvo — deixe vazio para manter)' : 'Cole o Client-Token da Z-API'}
                                class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                            />
                        </div>
                    </div>

                    {/* Campos Evolution API */}
                    <div data-wa-pane="evolution" style={`display: ${settings.whatsapp_provider === 'evolution' ? 'block' : 'none'};`} class="space-y-3">
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">URL da Evolution API</label>
                            <input
                                type="url"
                                name="whatsapp_evolution_url"
                                value={settings.whatsapp_evolution_url || ''}
                                placeholder="https://evo.seudominio.com"
                                class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                            />
                        </div>
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Nome da Instância</label>
                            <input
                                type="text"
                                name="whatsapp_evolution_instance"
                                value={settings.whatsapp_evolution_instance || ''}
                                placeholder="Ex: gundjatech"
                                class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                            />
                        </div>
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Evolution API Key</label>
                            <input
                                type="password"
                                name="whatsapp_evolution_api_key"
                                autocomplete="off"
                                placeholder={settings.has_evolution_key ? '•••••••• (salvo — deixe vazio para manter)' : 'Cole a API Key'}
                                class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                            />
                        </div>
                    </div>

                    {/* Campos Meta Cloud API */}
                    <div data-wa-pane="meta" style={`display: ${settings.whatsapp_provider === 'meta' ? 'block' : 'none'};`} class="space-y-3">
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Meta Phone Number ID</label>
                            <input
                                type="text"
                                name="whatsapp_phone_number_id"
                                value={settings.whatsapp_phone_number_id || ''}
                                placeholder="Ex: 1452542717940715"
                                class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                            />
                        </div>
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Meta Token Permanente</label>
                            <input
                                type="password"
                                name="whatsapp_access_token"
                                autocomplete="off"
                                placeholder="Deixe em branco para manter o token atual"
                                class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                            />
                        </div>
                    </div>

                    <button type="submit" data-loading-text="Salvando..." class="gt-btn-outline w-full flex items-center justify-center py-2.5 text-xs">
                        Salvar Credenciais WhatsApp
                    </button>
                </aside>
            </form>
        </AdminLayout>
    );
};
