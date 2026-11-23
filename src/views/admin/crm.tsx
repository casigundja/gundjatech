import type { FC } from 'hono/jsx';
import { AdminLayout } from './layout';

interface AdminCrmProps {
    currentUser: {
        id: number;
        name: string;
        email: string;
        role: string;
    };
    conversations: any[];
    settings: Record<string, string>;
    hasApiKey?: boolean;
    whatsappSyncEnabled?: boolean;
    channelControls?: {
        siteChatAiEnabled: boolean;
        whatsappSyncEnabled: boolean;
        whatsappAiEnabled: boolean;
        whatsappDirectorEnabled: boolean;
        officialWhatsappPhone: string;
        directorWhatsappPhone: string;
    };
    stats: {
        activeAutopilotCount: number;
        qualifyingCount: number;
        aiQuotationsCount: number;
        handoffCount: number;
    };
    successMessage?: string | null;
    errorMessage?: string | null;
}

const STAGE_LABELS: Record<string, string> = {
    new: 'Novo Lead',
    greeting: 'Boas-vindas',
    discovery: 'Diagnóstico',
    qualifying: 'Em Qualificação',
    qualification: 'Em Qualificação',
    proposal_ready: 'Proposta Pronta',
    handoff_human: 'Handoff Humano',
    closed: 'Encerrado'
};

export const AdminCrmView: FC<AdminCrmProps> = ({
    currentUser,
    conversations = [],
    settings = {},
    hasApiKey = false,
    whatsappSyncEnabled = true,
    channelControls = {
        siteChatAiEnabled: true,
        whatsappSyncEnabled: true,
        whatsappAiEnabled: true,
        whatsappDirectorEnabled: true,
        officialWhatsappPhone: '',
        directorWhatsappPhone: ''
    },
    stats,
    successMessage,
    errorMessage
}) => {
    const aiEnabled = settings.crm_ai_enabled !== '0';
    const autoDraft = settings.crm_ai_auto_draft_quotation !== '0';
    const provider = settings.crm_ai_provider || 'auto';
    const model = settings.crm_ai_model || 'gemini-2.5-flash';
    const agentName = settings.crm_ai_agent_name || 'Assistente IA GundjaTech';
    const activeMotorLabel =
        provider === 'gemini' || (provider === 'auto' && hasApiKey)
            ? `Google Gemini (${model}) + Fallback Workers AI`
            : provider === 'openai'
            ? `OpenAI (${model}) + Fallback Workers AI`
            : provider === 'local'
            ? 'Motor Comercial Local'
            : 'Cloudflare Workers AI (Llama 3.3 70B Edge)';
    const systemPrompt =
        settings.crm_ai_system_prompt ||
        'Você é o Assistente Comercial Sênior da GundjaTech (criação de sites, sistemas web, cibersegurança e operação contínua). Qualifique o lead e monte o pré-orçamento no CRM.';

    return (
        <AdminLayout
            title="CRM Autônomo IA • Painel Administrativo GundjaTech"
            activeNav="crm"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            {/* Sub-Header */}
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
                <p class="text-xs sm:text-sm text-[#8C95AA]">
                    Motor ativo: <strong class="text-[#F2C230]">{activeMotorLabel}</strong>
                    <span class="text-[#5D667B]"> • </span>
                    Status global:{' '}
                    <span class={`font-bold ${aiEnabled ? 'text-[#6EE7B7]' : 'text-red-400'}`}>
                        {aiEnabled ? 'Piloto Automático Ligado' : 'Pausado (Somente Humano)'}
                    </span>
                </p>
                <div class="flex items-center gap-2">
                    <a href="/admin/atendimento" class="gtb-ctrl-btn">
                        <span>Abrir Central de Chat</span>
                        <svg class="w-3.5 h-3.5 text-[#F2C230]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    </a>
                </div>
            </div>

            {/* ROW 1: 4 AUTONOMOUS CRM KPI CARDS (Padronizados Compactos) */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <a href="/admin/atendimento?status=open" class="gtb-card gtb-kpi-gold !py-3 !px-4 flex items-center justify-between gap-2 no-underline cursor-pointer hover:-translate-y-0.5 transition">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Piloto Automático</span>
                        <span class="gt-font-display text-lg font-extrabold text-white mt-0.5 block">{stats.activeAutopilotCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-warning">IA Ativa</span>
                </a>

                <a href="/admin/atendimento?status=open" class="gtb-card gtb-kpi-blue !py-3 !px-4 flex items-center justify-between gap-2 no-underline cursor-pointer hover:-translate-y-0.5 transition">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Em Qualificação</span>
                        <span class="gt-font-display text-lg font-extrabold text-white mt-0.5 block">{stats.qualifyingCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-info">Escopo</span>
                </a>

                <a href="/admin/orcamentos" class="gtb-card gtb-kpi-petrol !py-3 !px-4 flex items-center justify-between gap-2 no-underline cursor-pointer hover:-translate-y-0.5 transition">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Pré-Orçamentos IA</span>
                        <span class="gt-font-display text-lg font-extrabold text-[#34D399] mt-0.5 block">{stats.aiQuotationsCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-success">Gerados</span>
                </a>

                <a href="/admin/atendimento?status=handoff" class="gtb-card !py-3 !px-4 flex items-center justify-between gap-2 no-underline cursor-pointer hover:-translate-y-0.5 transition">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Transferidos Humano</span>
                        <span class="gt-font-display text-lg font-extrabold text-[#F2C230] mt-0.5 block">{stats.handoffCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-warning">Handoff</span>
                </a>
            </div>

            {/* ROW 1B: BARRA COMPACTA DE CONTROLE INDEPENDENTE DOS 3 CANAIS */}
            <div class="gtb-card !p-3">
                <div class="gt-crm-steps-grid">
                    {/* Canal 1: Chat do Site */}
                    <div class="gtb-surface-box rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-extrabold text-white">Chat do Site</span>
                                <span class={`gt-badge ${channelControls.siteChatAiEnabled && aiEnabled ? 'gt-badge-success' : 'gt-badge-danger'}`}>
                                    {channelControls.siteChatAiEnabled && aiEnabled ? 'IA Ativa' : 'Pausado'}
                                </span>
                            </div>
                            <div class="text-[10.5px] text-[#8C95AA] truncate">Widget comercial + Inbox</div>
                        </div>
                        <form action="/admin/canais/toggle" method="post" class="m-0 shrink-0">
                            <input type="hidden" name="channel" value="site_chat_ai_enabled" />
                            <input type="hidden" name="enabled" value={channelControls.siteChatAiEnabled ? '0' : '1'} />
                            <input type="hidden" name="return_to" value="/admin/crm-autonomo" />
                            <button type="submit" data-loading-text="..." class="gt-btn-outline gt-btn-xs">
                                {channelControls.siteChatAiEnabled ? 'Pausar' : 'Ativar'}
                            </button>
                        </form>
                    </div>

                    {/* Canal 2: WhatsApp 1 (Oficial / CRM IA) */}
                    <div class="gtb-surface-box rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-extrabold text-white">WhatsApp 1 · IA</span>
                                <span class={`gt-badge ${channelControls.whatsappSyncEnabled ? 'gt-badge-success' : 'gt-badge-danger'}`}>
                                    {channelControls.whatsappSyncEnabled ? (channelControls.whatsappAiEnabled ? 'Ativo' : 'Só Inbox') : 'Pausado'}
                                </span>
                            </div>
                            <div class="text-[10.5px] text-[#8C95AA] font-mono truncate">
                                {channelControls.officialWhatsappPhone || 'Definir em Configurações'}
                            </div>
                        </div>
                        <div class="flex items-center gap-1.5 shrink-0">
                            <form action="/admin/canais/toggle" method="post" class="m-0">
                                <input type="hidden" name="channel" value="whatsapp_sync_enabled" />
                                <input type="hidden" name="enabled" value={channelControls.whatsappSyncEnabled ? '0' : '1'} />
                                <input type="hidden" name="return_to" value="/admin/crm-autonomo" />
                                <button type="submit" data-loading-text="..." class={channelControls.whatsappSyncEnabled ? 'gt-btn-outline gt-btn-xs' : 'gt-btn-petrol gt-btn-xs'}>
                                    {channelControls.whatsappSyncEnabled ? 'Pausar' : 'Ativar'}
                                </button>
                            </form>
                            {channelControls.whatsappSyncEnabled && (
                                <form action="/admin/canais/toggle" method="post" class="m-0">
                                    <input type="hidden" name="channel" value="whatsapp_ai_enabled" />
                                    <input type="hidden" name="enabled" value={channelControls.whatsappAiEnabled ? '0' : '1'} />
                                    <input type="hidden" name="return_to" value="/admin/crm-autonomo" />
                                    <button type="submit" data-loading-text="..." class="gt-btn-outline gt-btn-xs" title="Pausar ou ativar resposta automática da IA no WhatsApp 1">
                                        {channelControls.whatsappAiEnabled ? 'IA: On' : 'IA: Off'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Canal 3: WhatsApp 2 (Diretor / Humano) */}
                    <div class="gtb-surface-box rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-extrabold text-white">WhatsApp 2 · Diretor</span>
                                <span class={`gt-badge ${channelControls.whatsappDirectorEnabled ? 'gt-badge-success' : 'gt-badge-danger'}`}>
                                    {channelControls.whatsappDirectorEnabled ? 'Recebendo' : 'Pausado'}
                                </span>
                            </div>
                            <div class="text-[10.5px] text-[#8C95AA] font-mono truncate">
                                {channelControls.directorWhatsappPhone || 'Definir em Configurações'}
                            </div>
                        </div>
                        <form action="/admin/canais/toggle" method="post" class="m-0 shrink-0">
                            <input type="hidden" name="channel" value="whatsapp_director_enabled" />
                            <input type="hidden" name="enabled" value={channelControls.whatsappDirectorEnabled ? '0' : '1'} />
                            <input type="hidden" name="return_to" value="/admin/crm-autonomo" />
                            <button type="submit" data-loading-text="..." class={channelControls.whatsappDirectorEnabled ? 'gt-btn-outline gt-btn-xs' : 'gt-btn-petrol gt-btn-xs'}>
                                {channelControls.whatsappDirectorEnabled ? 'Pausar' : 'Ativar'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* ROW 2: PIPELINE TABLE (7fr) + AI CONFIG PANEL (5fr) */}
            <div class="gt-crm-grid">
                <section class="gtb-card !p-5 flex flex-col">
                    <div class="flex items-center justify-between gap-3 flex-wrap pb-3.5 border-b border-white/10">
                        <div>
                            <h2 class="gt-font-display text-sm sm:text-base font-extrabold text-white">Pipeline de Qualificação Autônoma</h2>
                            <p class="text-xs text-[#8C95AA] mt-0.5">Visitantes do site e WhatsApp qualificados pela IA com pontuação e rascunho de proposta.</p>
                        </div>
                        <a href="/admin/atendimento" class="gt-btn-outline gt-btn-xs shrink-0">
                            Ver Inbox →
                        </a>
                    </div>

                    {conversations.length === 0 ? (
                        <div class="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
                            <span class="gtb-icon-box !w-12 !h-12 !rounded-2xl mb-3" aria-hidden="true">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </span>
                            <h3 class="gt-font-display text-sm font-extrabold text-white">Aguardando novos atendimentos da IA</h3>
                            <p class="text-xs text-[#8C95AA] mt-1.5 max-w-sm leading-relaxed">
                                Assim que um visitante iniciar conversa no site ou no WhatsApp, o lead aparece aqui com pontuação em tempo real.
                            </p>
                            <div class="flex items-center justify-center gap-2 flex-wrap mt-5 text-[11px] font-bold text-[#8C95AA]">
                                <span class="gtb-surface-box rounded-lg px-2.5 py-1">01 · Captação 24/7</span>
                                <span>→</span>
                                <span class="gtb-surface-box rounded-lg px-2.5 py-1">02 · Score &amp; Escopo</span>
                                <span>→</span>
                                <span class="gtb-surface-box rounded-lg px-2.5 py-1">03 · Pré-Orçamento</span>
                            </div>
                        </div>
                    ) : (
                        <div class="gt-table-wrap">
                            <table class="w-full text-left text-xs">
                                <thead>
                                    <tr class="border-b border-white/10 text-[10px] uppercase tracking-wider text-[#8C95AA]">
                                        <th class="py-2.5 px-3">Visitante / Lead</th>
                                        <th class="py-2.5 px-3">Score</th>
                                        <th class="py-2.5 px-3">Estágio &amp; Assunto</th>
                                        <th class="py-2.5 px-3">Modo</th>
                                        <th class="py-2.5 px-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-white/5">
                                    {conversations.map((conv: any) => {
                                        const score = Number(conv.lead_score || 0);
                                        const stageLabel = STAGE_LABELS[conv.crm_stage] || conv.crm_stage || 'Qualificação';
                                        const displayName = conv.visitor_name || conv.client_name || 'Visitante';
                                        const displayEmail = conv.visitor_email || conv.client_email || '';
                                        const displayPhone = conv.visitor_phone || conv.client_phone || '';
                                        const channelLabel =
                                            conv.channel === 'whatsapp'
                                                ? 'WhatsApp'
                                                : conv.channel === 'web_chat'
                                                ? 'Portal'
                                                : 'Site';
                                        const msgCount = Number(conv.message_count || 0);
                                        return (
                                            <tr class="hover:bg-white/[0.02]">
                                                <td class="py-3 px-3 align-middle">
                                                    <div class="font-bold text-white">{displayName}</div>
                                                    {displayEmail && !String(displayEmail).endsWith('.local') && (
                                                        <div class="text-[11px] text-[#8C95AA]">{displayEmail}</div>
                                                    )}
                                                    {displayPhone && (
                                                        <div class="text-[11px] text-[#8C95AA] font-semibold mt-0.5" style="font-variant-numeric: tabular-nums;">{displayPhone}</div>
                                                    )}
                                                </td>
                                                <td class="py-3 px-3 align-middle whitespace-nowrap">
                                                    <div class="font-extrabold text-white" style="font-variant-numeric: tabular-nums;">{score}/100</div>
                                                    <div class="w-16 h-1.5 rounded-full overflow-hidden mt-1" style="background: rgba(140, 149, 170, 0.22);">
                                                        <div class="h-full rounded-full" style={`width: ${Math.min(100, score)}%; background: linear-gradient(90deg, #063B5C 0%, #16749A 65%, #F2C230 100%);`}></div>
                                                    </div>
                                                </td>
                                                <td class="py-3 px-3 align-middle max-w-xs">
                                                    <div class="flex items-center gap-2 flex-wrap mb-0.5">
                                                        <span class="gt-badge gt-badge-info">{stageLabel}</span>
                                                        <span class="text-[10.5px] font-semibold text-[#8C95AA]">· {channelLabel}{msgCount > 0 ? ` (${msgCount} msg)` : ''}</span>
                                                    </div>
                                                    <p class="text-[11.5px] text-[#8C95AA] leading-snug truncate max-w-[220px]">{conv.last_message_preview || conv.subject || 'Atendimento Web'}</p>
                                                </td>
                                                <td class="py-3 px-3 align-middle whitespace-nowrap">
                                                    <span class={`gt-badge ${conv.ai_enabled && conv.status !== 'closed' ? 'gt-badge-success' : 'gt-badge-info'}`}>
                                                        {conv.ai_enabled && conv.status !== 'closed' ? 'Piloto IA' : 'Humano'}
                                                    </span>
                                                </td>
                                                <td class="py-3 px-3 align-middle text-right whitespace-nowrap">
                                                    <div class="inline-flex items-center gap-1.5">
                                                        <a href={`/admin/atendimento?id=${conv.id}`} class="gt-btn-petrol gt-btn-xs">
                                                            Abrir Chat
                                                        </a>
                                                        {conv.status !== 'closed' && (
                                                            <form action={`/admin/atendimento/${conv.id}/toggle-ai`} method="post" class="inline-block m-0">
                                                                <button type="submit" data-loading-text="..." class="gt-btn-outline gt-btn-xs">
                                                                    {conv.ai_enabled ? 'Pausar IA' : 'Reativar IA'}
                                                                </button>
                                                            </form>
                                                        )}
                                                        <form
                                                            action={`/admin/atendimento/${conv.id}/excluir`}
                                                            method="post"
                                                            class="inline-block m-0"
                                                            data-confirm="Deseja realmente excluir esta conversa e todo o histórico de mensagens?"
                                                        >
                                                            <button
                                                                type="submit"
                                                                class="gt-btn-danger-ghost gt-btn-icon-only"
                                                                title="Excluir conversa"
                                                                aria-label="Excluir conversa"
                                                            >
                                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                                    <path d="M3 6h18" />
                                                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                                </svg>
                                                            </button>
                                                        </form>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* AI Configuration Panel (Clean Compact Executive Card) */}
                <aside class="gtb-card !p-4 space-y-3">
                    <div class="flex items-center gap-2.5 pb-3 border-b border-white/10">
                        <span class="gtb-icon-box !w-8 !h-8">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                        </span>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center justify-between gap-2">
                                <h2 class="gt-font-display text-sm font-extrabold text-white leading-tight">Agente IA</h2>
                                <span class={`gt-badge ${aiEnabled ? 'gt-badge-success' : 'gt-badge-danger'}`}>
                                    {aiEnabled ? '● Online' : '● Pausado'}
                                </span>
                            </div>
                            <p class="text-[11px] text-[#8C95AA] truncate">
                                Gemini + Workers AI (Site &amp; WhatsApp)
                            </p>
                        </div>
                    </div>

                    <form id="gt-crm-config-form" action="/admin/crm-autonomo/configuracoes" method="post" data-dirty-guard="1" class="space-y-3 text-xs">
                        {/* Switches compactos */}
                        <div class="gtb-surface-box rounded-xl overflow-hidden">
                            <label class="flex items-center justify-between gap-3 px-3.5 py-2.5 cursor-pointer" style="border-bottom: 1px solid rgba(22, 116, 154, 0.14);">
                                <div class="min-w-0">
                                    <div class="text-xs font-bold text-white leading-tight">Piloto Automático Global</div>
                                    <div class="text-[11px] text-[#8C95AA]">Chave geral de respostas automáticas</div>
                                </div>
                                <input type="checkbox" name="crm_ai_enabled" value="1" checked={aiEnabled} class="gt-switch shrink-0" />
                            </label>

                            <label class="flex items-center justify-between gap-3 px-3.5 py-2.5 cursor-pointer">
                                <div class="min-w-0">
                                    <div class="text-xs font-bold text-white leading-tight">Auto-gerar Pré-Orçamento</div>
                                    <div class="text-[11px] text-[#8C95AA]">Criar rascunho ao qualificar lead</div>
                                </div>
                                <input type="checkbox" name="crm_ai_auto_draft_quotation" value="1" checked={autoDraft} class="gt-switch shrink-0" />
                            </label>
                        </div>

                        {/* Linha 1: Nome + Motor */}
                        <div class="gt-grid-2 !gap-2.5">
                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Nome do Assistente</label>
                                <input
                                    type="text"
                                    name="crm_ai_agent_name"
                                    value={agentName}
                                    class="w-full rounded-xl px-3 py-1.5 text-xs"
                                />
                            </div>

                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Motor de IA</label>
                                <select name="crm_ai_provider" class="w-full rounded-xl px-3 py-1.5 text-xs">
                                    <option value="auto" selected={provider === 'auto'}>Automático (Gemini + Edge)</option>
                                    <option value="gemini" selected={provider === 'gemini'}>Google Gemini (Primário)</option>
                                    <option value="workers_ai" selected={provider === 'workers_ai'}>Workers AI (Edge Nativo)</option>
                                    <option value="openai" selected={provider === 'openai'}>OpenAI (Primário)</option>
                                    <option value="local" selected={provider === 'local'}>Motor Local</option>
                                </select>
                            </div>
                        </div>

                        {/* Linha 2: Modelo LLM + Chave API lado a lado */}
                        <div class="gt-grid-2 !gap-2.5">
                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Modelo LLM</label>
                                <input
                                    type="text"
                                    name="crm_ai_model"
                                    value={model}
                                    placeholder="gemini-2.5-flash"
                                    class="w-full rounded-xl px-3 py-1.5 text-xs font-mono"
                                />
                            </div>

                            <div>
                                <div class="flex items-center justify-between gap-1 mb-1">
                                    <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Chave API</label>
                                    {hasApiKey && (
                                        <span class="gt-badge gt-badge-success text-[9.5px]">✓ Salva</span>
                                    )}
                                </div>
                                <div style="position: relative; display: flex; align-items: center;">
                                    <input
                                        id="gt-crm-api-key"
                                        type="password"
                                        name="crm_ai_api_key"
                                        autocomplete="off"
                                        placeholder={hasApiKey ? '••••••••' : 'AIza... / sk-...'}
                                        style="padding-left: 10px; padding-right: 34px;"
                                        class="w-full rounded-xl py-1.5 text-xs font-mono"
                                    />
                                    <button
                                        type="button"
                                        aria-label="Mostrar ou ocultar chave"
                                        onclick="var i=document.getElementById('gt-crm-api-key');if(i){i.type=i.type==='password'?'text':'password';}"
                                        style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: transparent; border: 0; padding: 3px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: #7898AE;"
                                    >
                                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Diretrizes Comerciais &amp; Tom de Voz</label>
                            <textarea
                                name="crm_ai_system_prompt"
                                rows={2}
                                class="w-full rounded-xl px-3 py-1.5 text-xs leading-relaxed"
                            >{systemPrompt}</textarea>
                        </div>
                    </form>

                    {/* Rodapé de ações lado a lado (Salvar + Testar IA) */}
                    <div class="pt-2.5 border-t border-white/10 grid grid-cols-2 gap-2.5">
                        <button
                            type="submit"
                            form="gt-crm-config-form"
                            data-loading-text="Salvando..."
                            class="gt-btn-primary gt-btn-sm justify-center"
                        >
                            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M5 13l4 4L19 7"/></svg>
                            <span>Salvar</span>
                        </button>
                        <form action="/admin/crm-autonomo/testar" method="post" class="m-0">
                            <button
                                type="submit"
                                data-loading-text="Testando..."
                                class="gt-btn-outline gt-btn-sm w-full justify-center"
                            >
                                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                                <span>Testar IA</span>
                            </button>
                        </form>
                    </div>
                </aside>
            </div>
        </AdminLayout>
    );
};
