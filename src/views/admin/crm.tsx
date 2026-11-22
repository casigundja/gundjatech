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
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <a href="/admin/atendimento?status=open" class="gtb-card gtb-kpi-gold !p-4 flex items-center justify-between gap-2 no-underline cursor-pointer hover:-translate-y-0.5 transition">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Piloto Automático</span>
                        <span class="gt-font-display text-xl font-extrabold text-white mt-0.5 block">{stats.activeAutopilotCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-warning">IA Ativa</span>
                </a>

                <a href="/admin/atendimento?status=open" class="gtb-card gtb-kpi-blue !p-4 flex items-center justify-between gap-2 no-underline cursor-pointer hover:-translate-y-0.5 transition">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Em Qualificação</span>
                        <span class="gt-font-display text-xl font-extrabold text-white mt-0.5 block">{stats.qualifyingCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-info">Escopo</span>
                </a>

                <a href="/admin/orcamentos" class="gtb-card gtb-kpi-petrol !p-4 flex items-center justify-between gap-2 no-underline cursor-pointer hover:-translate-y-0.5 transition">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Pré-Orçamentos IA</span>
                        <span class="gt-font-display text-xl font-extrabold text-[#34D399] mt-0.5 block">{stats.aiQuotationsCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-success">Gerados</span>
                </a>

                <a href="/admin/atendimento?status=open" class="gtb-card !p-4 flex items-center justify-between gap-2 no-underline cursor-pointer hover:-translate-y-0.5 transition">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Transferidos Humano</span>
                        <span class="gt-font-display text-xl font-extrabold text-[#F2C230] mt-0.5 block">{stats.handoffCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-warning">Handoff</span>
                </a>
            </div>

            {/* ROW 2: PIPELINE TABLE (8 cols) + AI CONFIG PANEL (4 cols) */}
            <div class="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
                <section class="xl:col-span-8 gtb-card space-y-4">
                    <div>
                        <h2 class="text-sm sm:text-base font-bold text-white">Pipeline de Qualificação Autônoma</h2>
                        <p class="text-[11px] text-[#8C95AA]">O agente conversa com cada visitante, extrai escopo/prazo/orçamento, atualiza o CRM e gera rascunhos de orçamento.</p>
                    </div>

                    {conversations.length === 0 ? (
                        <div class="gt-empty-state">
                            Nenhum atendimento no CRM Autônomo ainda. Assim que um visitante iniciar o chat no site, a IA assume a qualificação automaticamente aqui.
                        </div>
                    ) : (
                        <div class="gt-table-wrap">
                            <table class="w-full text-left text-xs">
                                <thead>
                                    <tr class="border-b border-white/10 text-[10.5px] uppercase tracking-wider text-[#8C95AA]">
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
                                        return (
                                            <tr class="hover:bg-white/[0.02]">
                                                <td class="py-3.5 px-3 align-middle">
                                                    <div class="font-bold text-white">{conv.visitor_name || 'Visitante'}</div>
                                                    {conv.visitor_email && !String(conv.visitor_email).endsWith('.local') && (
                                                        <div class="text-[11px] text-[#8C95AA]">{conv.visitor_email}</div>
                                                    )}
                                                    {conv.visitor_phone && (
                                                        <div class="text-[11px] text-[#F2C230] font-mono font-semibold mt-0.5">{conv.visitor_phone}</div>
                                                    )}
                                                </td>
                                                <td class="py-3.5 px-3 align-middle whitespace-nowrap">
                                                    <div class="font-extrabold text-white">{score}/100</div>
                                                    <div class="w-16 h-1.5 rounded-full overflow-hidden mt-1" style="background: rgba(140, 149, 170, 0.22);">
                                                        <div class="h-full rounded-full" style={`width: ${Math.min(100, score)}%; background: linear-gradient(90deg, #F2C230 0%, #34D399 100%);`}></div>
                                                    </div>
                                                </td>
                                                <td class="py-3.5 px-3 align-middle max-w-xs">
                                                    <div class="flex items-center gap-1.5 flex-wrap mb-1">
                                                        <span class="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#16749A]/25 text-[#38BDF8]">
                                                            {stageLabel}
                                                        </span>
                                                        {conv.channel === 'whatsapp' ? (
                                                            <span class="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-[#6EE7B7]">
                                                                WhatsApp
                                                            </span>
                                                        ) : (
                                                            <span class="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/15 text-sky-300">
                                                                Site
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p class="text-[11.5px] text-[#D5DCEB] leading-snug truncate max-w-[240px]">{conv.subject || 'Atendimento Web'}</p>
                                                </td>
                                                <td class="py-3.5 px-3 align-middle whitespace-nowrap">
                                                    {conv.ai_enabled && conv.status !== 'closed' ? (
                                                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F2C230]/15 border border-[#F2C230]/35 text-[#F2C230] text-[10px] font-bold">
                                                            Piloto IA
                                                        </span>
                                                    ) : (
                                                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#D5DCEB] text-[10px] font-bold">
                                                            Humano
                                                        </span>
                                                    )}
                                                </td>
                                                <td class="py-3.5 px-3 align-middle text-right whitespace-nowrap">
                                                    <div class="inline-flex items-center gap-1.5">
                                                        <a href={`/admin/atendimento?id=${conv.id}`} class="gt-btn-primary gt-btn-xs">
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
                                                            onsubmit="return confirm('Deseja realmente excluir esta conversa e todo o histórico de mensagens?')"
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

                {/* AI Configuration Panel (Compact Executive Card) */}
                <aside class="xl:col-span-4 gtb-card gtb-kpi-gold !p-4 sm:!p-5 space-y-3.5">
                    <div class="flex items-center gap-3">
                        <span class="gtb-icon-box">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                        </span>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center justify-between gap-2">
                                <h2 class="gt-font-display text-[15px] font-extrabold text-white leading-tight">Agente IA</h2>
                                <span class={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                    aiEnabled
                                        ? 'bg-emerald-500/15 text-[#6EE7B7]'
                                        : 'bg-red-500/15 text-red-300'
                                }`}>
                                    <span class={`w-1.5 h-1.5 rounded-full ${aiEnabled ? 'bg-[#34D399]' : 'bg-red-400'}`}></span>
                                    {aiEnabled ? 'Online' : 'Pausado'}
                                </span>
                            </div>
                            <p class="text-[11px] text-[#8C95AA] truncate mt-0.5">
                                Gemini + Cloudflare Workers AI (Site &amp; WhatsApp)
                            </p>
                        </div>
                    </div>

                    <form id="gt-crm-config-form" action="/admin/crm-autonomo/configuracoes" method="post" data-dirty-guard="1" class="space-y-3 text-xs">
                        {/* Bloco Compacto de Switches */}
                        <div class="gtb-surface-box rounded-xl divide-y divide-white/10 overflow-hidden">
                            <label class="flex items-center justify-between gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-white/[0.03] transition">
                                <div class="min-w-0">
                                    <div class="text-xs font-bold text-white leading-tight">Piloto Automático Ativo</div>
                                    <div class="text-[10.5px] text-[#8C95AA]">Responder leads no chat e WhatsApp</div>
                                </div>
                                <input type="checkbox" name="crm_ai_enabled" value="1" checked={aiEnabled} class="gt-switch" />
                            </label>

                            <label class="flex items-center justify-between gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-white/[0.03] transition">
                                <div class="min-w-0">
                                    <div class="text-xs font-bold text-white leading-tight">Auto-gerar Pré-Orçamento</div>
                                    <div class="text-[10.5px] text-[#8C95AA]">Criar rascunho ao qualificar lead</div>
                                </div>
                                <input type="checkbox" name="crm_ai_auto_draft_quotation" value="1" checked={autoDraft} class="gt-switch" />
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
                                    class="w-full rounded-xl px-3 py-2 text-xs"
                                />
                            </div>

                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Motor de IA</label>
                                <select name="crm_ai_provider" class="w-full rounded-xl px-3 py-2 text-xs">
                                    <option value="auto" selected={provider === 'auto'}>Automático (Gemini + Edge)</option>
                                    <option value="gemini" selected={provider === 'gemini'}>Google Gemini (Primário)</option>
                                    <option value="workers_ai" selected={provider === 'workers_ai'}>Workers AI (Edge Nativo)</option>
                                    <option value="openai" selected={provider === 'openai'}>OpenAI (Primário)</option>
                                    <option value="local" selected={provider === 'local'}>Motor Local</option>
                                </select>
                            </div>
                        </div>

                        {/* Linha 2: Modelo + Chave API */}
                        <div class="gt-grid-2 !gap-2.5">
                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Modelo LLM</label>
                                <input
                                    type="text"
                                    name="crm_ai_model"
                                    value={model}
                                    placeholder="gemini-2.5-flash"
                                    class="w-full rounded-xl px-3 py-2 text-xs font-mono"
                                />
                            </div>

                            <div>
                                <div class="flex items-center justify-between gap-1 mb-1">
                                    <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Chave API</label>
                                    {hasApiKey && (
                                        <span class="text-[9.5px] font-extrabold text-[#6EE7B7]">✓ Ativa</span>
                                    )}
                                </div>
                                <div class="relative">
                                    <input
                                        id="gt-crm-api-key"
                                        type="password"
                                        name="crm_ai_api_key"
                                        autocomplete="off"
                                        placeholder={hasApiKey ? '••••••••••••' : 'AIza... / sk-...'}
                                        style="padding-left: 12px; padding-right: 34px;"
                                        class="w-full rounded-xl py-2 text-xs font-mono"
                                    />
                                    <button
                                        type="button"
                                        aria-label="Mostrar ou ocultar chave"
                                        onclick="var i=document.getElementById('gt-crm-api-key');if(i){i.type=i.type==='password'?'text':'password';}"
                                        class="absolute right-2 top-1/2 -translate-y-1/2 text-[#8C95AA] hover:text-[#F2C230] bg-transparent border-0 cursor-pointer p-1"
                                    >
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Diretrizes Comerciais &amp; Tom de Voz</label>
                            <textarea
                                name="crm_ai_system_prompt"
                                rows={3}
                                class="w-full rounded-xl px-3 py-2 text-xs leading-relaxed"
                            >{systemPrompt}</textarea>
                        </div>
                    </form>

                    {/* Ações lado a lado (altura enxuta + feedback visual ao clicar) */}
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        <button
                            type="submit"
                            form="gt-crm-config-form"
                            data-loading-text="Salvando..."
                            class="btn-primary w-full flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs"
                        >
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M5 13l4 4L19 7"/></svg>
                            <span>Salvar Configurações</span>
                        </button>

                        <form action="/admin/crm-autonomo/testar" method="post" class="m-0">
                            <button
                                type="submit"
                                data-loading-text="Testando IA..."
                                class="gt-btn-outline w-full flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs"
                            >
                                <svg class="w-3.5 h-3.5 text-[#F2C230]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                                <span>Testar IA Agora</span>
                            </button>
                        </form>
                    </div>
                </aside>
            </div>
        </AdminLayout>
    );
};
