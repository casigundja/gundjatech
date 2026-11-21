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
    stats,
    successMessage,
    errorMessage
}) => {
    const aiEnabled = settings.crm_ai_enabled !== '0';
    const autoDraft = settings.crm_ai_auto_draft_quotation !== '0';
    const provider = settings.crm_ai_provider || 'workers_ai';
    const model = settings.crm_ai_model || '@cf/meta/llama-3.1-8b-instruct';
    const agentName = settings.crm_ai_agent_name || 'Assistente IA GundjaTech';
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
                    Motor ativo: <strong class="text-[#F2C230]">Cloudflare Workers AI ({model})</strong>
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

            {/* ROW 1: 4 AUTONOMOUS CRM KPI CARDS */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <a href="/admin/atendimento?status=open" class="gtb-card gtb-kpi-gold flex flex-col justify-between gap-3 no-underline cursor-pointer hover:border-[#F2C230]/50 hover:-translate-y-0.5 transition-all">
                    <span class="text-xs font-semibold text-[#D5DCEB]">Em Piloto Automático</span>
                    <div class="flex items-baseline justify-between">
                        <span class="gt-font-display text-2xl font-extrabold text-white">{stats.activeAutopilotCount}</span>
                        <span class="px-2 py-0.5 rounded-full bg-[#F2C230]/15 text-[#F2C230] text-[10px] font-bold">IA Ativa</span>
                    </div>
                </a>

                <a href="/admin/atendimento?status=open" class="gtb-card gtb-kpi-blue flex flex-col justify-between gap-3 no-underline cursor-pointer hover:border-[#38BDF8]/50 hover:-translate-y-0.5 transition-all">
                    <span class="text-xs font-semibold text-[#D5DCEB]">Em Qualificação</span>
                    <div class="flex items-baseline justify-between">
                        <span class="gt-font-display text-2xl font-extrabold text-white">{stats.qualifyingCount}</span>
                        <span class="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 text-[10px] font-bold">Coletando Escopo</span>
                    </div>
                </a>

                <a href="/admin/orcamentos" class="gtb-card gtb-kpi-petrol flex flex-col justify-between gap-3 no-underline cursor-pointer hover:border-[#6EE7B7]/50 hover:-translate-y-0.5 transition-all">
                    <span class="text-xs font-semibold text-[#D5DCEB]">Pré-Orçamentos IA</span>
                    <div class="flex items-baseline justify-between">
                        <span class="gt-font-display text-2xl font-extrabold text-white">{stats.aiQuotationsCount}</span>
                        <span class="px-2 py-0.5 rounded-full bg-emerald-500/15 text-[#6EE7B7] text-[10px] font-bold">Gerados</span>
                    </div>
                </a>

                <a href="/admin/atendimento?status=open" class="gtb-card flex flex-col justify-between gap-3 no-underline cursor-pointer hover:border-amber-400/50 hover:-translate-y-0.5 transition-all">
                    <span class="text-xs font-semibold text-[#D5DCEB]">Transferidos p/ Humano</span>
                    <div class="flex items-baseline justify-between">
                        <span class="gt-font-display text-2xl font-extrabold text-white">{stats.handoffCount}</span>
                        <span class="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-bold">Handoff</span>
                    </div>
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
                                                <td class="py-3 px-3 align-top">
                                                    <div class="font-bold text-white">{conv.visitor_name || 'Visitante'}</div>
                                                    <div class="text-[10.5px] text-[#8C95AA]">{conv.visitor_email || '—'}</div>
                                                    {conv.visitor_phone && <div class="text-[10px] text-[#F2C230] font-semibold mt-0.5">{conv.visitor_phone}</div>}
                                                </td>
                                                <td class="py-3 px-3 align-top whitespace-nowrap">
                                                    <div class="font-extrabold text-white">{score}/100</div>
                                                    <div class="w-16 h-1.5 rounded-full bg-[#222738] overflow-hidden mt-1">
                                                        <div class="h-full rounded-full" style={`width: ${Math.min(100, score)}%; background: linear-gradient(90deg, #F2C230 0%, #34D399 100%);`}></div>
                                                    </div>
                                                </td>
                                                <td class="py-3 px-3 align-top max-w-xs">
                                                    <span class="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold mb-1 bg-[#16749A]/25 text-[#38BDF8]">
                                                        {stageLabel}
                                                    </span>
                                                    <p class="text-[11px] text-[#D5DCEB] leading-snug">{conv.subject || 'Atendimento Web'}</p>
                                                </td>
                                                <td class="py-3 px-3 align-top whitespace-nowrap">
                                                    {conv.ai_enabled && conv.status !== 'closed' ? (
                                                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F2C230]/15 border border-[#F2C230]/35 text-[#F2C230] text-[10px] font-bold">
                                                            Piloto IA
                                                        </span>
                                                    ) : (
                                                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#D5DCEB] text-[10px] font-bold">
                                                            Humano
                                                        </span>
                                                    )}
                                                </td>
                                                <td class="py-3 px-3 align-top text-right whitespace-nowrap space-y-1.5">
                                                    <div>
                                                        <a href={`/admin/atendimento?id=${conv.id}`} class="gt-btn-primary !py-1.5 !px-3 !text-[11px]">
                                                            Abrir Chat
                                                        </a>
                                                    </div>
                                                    {conv.status !== 'closed' && (
                                                        <form action={`/admin/atendimento/${conv.id}/toggle-ai`} method="post">
                                                            <button type="submit" class="gt-btn-outline !py-1 !px-2.5 !text-[10px]">
                                                                {conv.ai_enabled ? 'Assumir (Pausar IA)' : 'Reativar IA'}
                                                            </button>
                                                        </form>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* AI Configuration Panel */}
                <aside class="xl:col-span-4 gtb-card space-y-4">
                    <div>
                        <h2 class="text-sm sm:text-base font-bold text-white">Configurações do Agente IA</h2>
                        <p class="text-[11px] text-[#8C95AA]">Ajuste o comportamento do Piloto Automático no Cloudflare Workers AI.</p>
                    </div>

                    <form action="/admin/crm-autonomo/configuracoes" method="post" class="space-y-3 text-xs">
                        <label class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer">
                            <span class="font-bold text-white">Piloto Automático IA Global</span>
                            <input type="checkbox" name="crm_ai_enabled" value="1" checked={aiEnabled} class="w-4 h-4 accent-[#F2C230]" />
                        </label>

                        <label class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer">
                            <span class="font-bold text-white">Gerar Pré-Orçamentos Automáticos</span>
                            <input type="checkbox" name="crm_ai_auto_draft_quotation" value="1" checked={autoDraft} class="w-4 h-4 accent-[#F2C230]" />
                        </label>

                        <div>
                            <label class="block text-[11px] font-bold text-[#8C95AA] mb-1">Nome do Assistente</label>
                            <input type="text" name="crm_ai_agent_name" value={agentName} class="w-full rounded-xl bg-[#0D1322] border border-white/10 px-3 py-2 text-white text-xs" />
                        </div>

                        <div>
                            <label class="block text-[11px] font-bold text-[#8C95AA] mb-1">Provedor / Modelo</label>
                            <select name="crm_ai_provider" class="w-full rounded-xl bg-[#0D1322] border border-white/10 px-3 py-2 text-white text-xs">
                                <option value="workers_ai" selected={provider === 'workers_ai'}>Cloudflare Workers AI (Edge Nativo)</option>
                                <option value="gemini" selected={provider === 'gemini'}>Google Gemini</option>
                                <option value="local" selected={provider === 'local'}>Motor Comercial Local</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-[11px] font-bold text-[#8C95AA] mb-1">Prompt do Sistema</label>
                            <textarea name="crm_ai_system_prompt" rows={4} class="w-full rounded-xl bg-[#0D1322] border border-white/10 px-3 py-2 text-white text-xs">{systemPrompt}</textarea>
                        </div>

                        <button type="submit" class="gt-btn-primary w-full justify-center">
                            Salvar Configurações IA
                        </button>
                    </form>

                    <form action="/admin/crm-autonomo/testar" method="post" class="pt-2 border-t border-white/10">
                        <button type="submit" class="gt-btn-outline w-full text-center">
                            ⚡ Testar Conexão IA Agora
                        </button>
                    </form>
                </aside>
            </div>
        </AdminLayout>
    );
};
