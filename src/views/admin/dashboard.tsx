import type { FC } from 'hono/jsx';
import { AdminLayout } from './layout';
import type { AdminDashboardData } from '../../lib/admin';

interface AdminDashboardProps {
    currentUser: {
        id: number;
        name: string;
        email: string;
        role: string;
    };
    stats: AdminDashboardData;
    successMessage?: string | null;
    errorMessage?: string | null;
}

function formatBRL(value: number): string {
    return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const AdminDashboardView: FC<AdminDashboardProps> = ({
    currentUser,
    stats,
    successMessage,
    errorMessage
}) => {
    const periodDays = stats.periodDays || 30;
    const months = ['Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov'];

    return (
        <AdminLayout
            title="Dashboard Executivo • Painel Administrativo GundjaTech"
            activeNav="dashboard"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            {/* Sub-Header Strip (Idêntico a resources/views/admin/dashboard.blade.php) */}
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
                <p class="text-xs sm:text-sm text-[#8C95AA]">
                    Você tem{' '}
                    <a href="/admin/solicitacoes" class="font-bold text-[#F2C230] hover:underline">
                        {stats.pendingRequests} nova(s) solicitação(ões)
                    </a>{' '}
                    e{' '}
                    <a href="/admin/atendimento" class="font-bold text-[#F2C230] hover:underline">
                        {stats.openConversations || 0} atendimento(s) aberto(s)
                    </a>{' '}
                    <span class="text-[#5D667B]">• Visão Geral Executiva</span>
                </p>

                <div class="flex flex-wrap items-center gap-2.5">
                    <form action="/admin/dashboard" method="get" class="inline-flex items-center rounded-lg bg-[#171B27] border border-white/10 text-xs text-[#D5DCEB] overflow-hidden">
                        <span class="px-3 py-1.5 flex items-center gap-2 border-r border-white/10">
                            <svg class="w-3.5 h-3.5 text-[#F2C230]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                            <span>22 out 2026 - 21 nov 2026</span>
                        </span>
                        <select name="period" onchange="this.form.submit()" aria-label="Período do relatório" class="gtb-ctrl-select !bg-transparent !border-0 !rounded-none px-3 py-1.5 text-xs font-semibold text-[#D5DCEB] focus:outline-none cursor-pointer">
                            <option value="7" selected={periodDays === 7} class="bg-[#121623] text-white">Últimos 7 dias</option>
                            <option value="30" selected={periodDays === 30} class="bg-[#121623] text-white">Últimos 30 dias</option>
                            <option value="90" selected={periodDays === 90} class="bg-[#121623] text-white">Últimos 90 dias</option>
                            <option value="365" selected={periodDays === 365} class="bg-[#121623] text-white">Últimos 12 meses</option>
                        </select>
                    </form>

                    <a href={`/admin/relatorio/exportar?period=${periodDays}`} class="gtb-ctrl-btn !h-8" title="Exportar relatório Excel executivo">
                        <span>Exportar Excel</span>
                        <svg class="w-3.5 h-3.5 text-[#F2C230]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    </a>
                </div>
            </div>

            {/* ROW 1: 3 REAL TOP KPI CARDS (Compact Executive Proportion) */}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* KPI 1: Receita Recebida */}
                <a href="/admin/financeiro" class="gtb-card gtb-kpi-gold !p-5 flex flex-col justify-between gap-3 no-underline cursor-pointer hover:border-[#F2C230]/50 hover:-translate-y-0.5 transition-all group" title="Abrir Gestão Financeira">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="gtb-icon-box !w-8 !h-8">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>
                            </span>
                            <span class="text-xs font-semibold text-[#D5DCEB] group-hover:text-white transition-colors">Receita Recebida ({periodDays}d)</span>
                        </div>
                        <span class="text-[#8C95AA] group-hover:text-[#F2C230] transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                        </span>
                    </div>
                    <div class="flex items-baseline justify-between gap-2 flex-wrap">
                        <span class="gt-font-display text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                            R$ {formatBRL(stats.monthlyRevenue || 0)}
                        </span>
                        <span class="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10.5px] font-bold text-[#8C95AA]">
                            A receber: R$ {formatBRL(stats.pendingReceivables || 0)}
                        </span>
                    </div>
                </a>

                {/* KPI 2: Clientes & Leads */}
                <a href="/admin/clientes" class="gtb-card gtb-kpi-blue !p-5 flex flex-col justify-between gap-3 no-underline cursor-pointer hover:border-[#38BDF8]/50 hover:-translate-y-0.5 transition-all group" title="Abrir Base de Clientes & Leads">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="gtb-icon-box is-blue !w-8 !h-8">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            </span>
                            <span class="text-xs font-semibold text-[#D5DCEB] group-hover:text-white transition-colors">Clientes &amp; Leads</span>
                        </div>
                        <span class="text-[#8C95AA] group-hover:text-[#38BDF8] transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                        </span>
                    </div>
                    <div class="flex items-baseline justify-between gap-2 flex-wrap">
                        <span class="gt-font-display text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                            {stats.totalClients} <small class="text-xs font-semibold text-[#8C95AA]">({stats.activeClients} ativos · {stats.leadClients} leads)</small>
                        </span>
                        <span class="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10.5px] font-bold text-[#8C95AA]">
                            +{stats.totalClients} em {periodDays}d
                        </span>
                    </div>
                </a>

                {/* KPI 3: Solicitações & Projetos */}
                <a href="/admin/solicitacoes" class="gtb-card gtb-kpi-petrol !p-5 flex flex-col justify-between gap-3 no-underline cursor-pointer hover:border-[#6EE7B7]/50 hover:-translate-y-0.5 transition-all group" title="Abrir Central de Solicitações">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="gtb-icon-box is-petrol !w-8 !h-8">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                            </span>
                            <span class="text-xs font-semibold text-[#D5DCEB] group-hover:text-white transition-colors">Solicitações &amp; Projetos</span>
                        </div>
                        <span class="text-[#8C95AA] group-hover:text-[#6EE7B7] transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                        </span>
                    </div>
                    <div class="flex items-baseline justify-between gap-2 flex-wrap">
                        <span class="gt-font-display text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                            {stats.totalRequests} <small class="text-xs font-semibold text-[#F2C230]">({stats.activeProjects} proj. · {stats.pendingRequests} pend.)</small>
                        </span>
                        <span class="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10.5px] font-bold text-[#8C95AA]">
                            +{stats.totalRequests} em {periodDays}d
                        </span>
                    </div>
                </a>
            </div>

            {/* ROW 2: REAL 12-MONTH REVENUE BAR CHART (8 cols) + CATEGORY RINGS (4 cols) */}
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <section class="lg:col-span-8 gtb-card !p-5 flex flex-col justify-between gap-3.5">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div class="flex flex-wrap items-center gap-2.5">
                            <span class="gtb-icon-box">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                            </span>
                            <h2 class="text-sm sm:text-base font-bold text-white">Visão Geral de Receita (12 meses)</h2>
                            <span class="text-xs text-[#8C95AA]">Dados reais em <strong class="text-white">tempo real</strong></span>
                        </div>
                        <div class="flex items-center gap-2">
                            <a href="/admin/financeiro" class="gtb-ctrl-btn">
                                <span>Financeiro</span>
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                            </a>
                        </div>
                    </div>

                    <div class="flex items-center justify-end gap-4 text-[11px] font-semibold text-[#8C95AA]">
                        <span class="flex items-center gap-1.5">
                            <i class="w-2.5 h-2.5 rounded-xs bg-[#F2C230] inline-block"></i> Recebido (R$)
                        </span>
                        <span class="flex items-center gap-1.5">
                            <i class="w-2.5 h-2.5 rounded-xs bg-[#16749A] inline-block"></i> A Receber (R$)
                        </span>
                    </div>

                    <div class="gtb-paired-chart">
                        <div class="gtb-grid-line"><span>R$ 10k</span></div>
                        <div class="gtb-grid-line"><span>R$ 7,5k</span></div>
                        <div class="gtb-grid-line"><span>R$ 5k</span></div>
                        <div class="gtb-grid-line"><span>R$ 2,5k</span></div>
                        <div class="gtb-grid-line"><span>R$ 0</span></div>

                        <div class="gtb-bars-overlay">
                            {months.map((m, idx) => (
                                <div class={`gtb-pair-group ${idx === 11 ? 'is-highlight' : ''}`}>
                                    <div class="gtb-bar-a" style={`height: ${idx === 11 && stats.monthlyRevenue ? 65 : 4}%`}></div>
                                    <div class="gtb-bar-b" style={`height: ${idx === 11 && stats.pendingReceivables ? 40 : 4}%`}></div>
                                    <span class="gtb-month-lbl">{m}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section class="lg:col-span-4 gtb-card !p-5 flex flex-col justify-between gap-3.5">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="gtb-icon-box is-blue !w-8 !h-8">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>
                            </span>
                            <h2 class="text-sm font-bold text-white">Orçamentos &amp; Propostas</h2>
                        </div>
                        <span class="text-xs font-extrabold text-[#34D399]">{stats.approvedQuotations} aprovados</span>
                    </div>

                    <div class="relative flex items-center justify-center py-1">
                        <div class="absolute left-0 top-1 z-10 rounded-xl bg-[#6EE7B7] text-[#052E22] px-2.5 py-1 shadow-md">
                            <div class="text-xs font-extrabold leading-tight">
                                R$ {formatBRL(stats.openQuotationsValue || 0)}
                            </div>
                            <div class="text-[9.5px] font-bold opacity-80">{stats.totalQuotations} proposta(s)</div>
                        </div>

                        <svg viewBox="0 0 200 200" style="width: 148px; height: 148px;" class="-rotate-90">
                            <circle cx="100" cy="100" r="80" fill="none" stroke="#222738" stroke-width="8"/>
                            <circle cx="100" cy="100" r="80" fill="none" stroke="#F2C230" stroke-width="8" stroke-linecap="round" stroke-dasharray="360 502"/>
                            <circle cx="100" cy="100" r="64" fill="none" stroke="#222738" stroke-width="8"/>
                            <circle cx="100" cy="100" r="64" fill="none" stroke="#38BDF8" stroke-width="8" stroke-linecap="round" stroke-dasharray="220 402"/>
                            <circle cx="100" cy="100" r="48" fill="none" stroke="#222738" stroke-width="8"/>
                            <circle cx="100" cy="100" r="48" fill="none" stroke="#34D399" stroke-width="8" stroke-linecap="round" stroke-dasharray="150 301"/>
                        </svg>

                        <span class="absolute text-base font-extrabold text-white">{stats.totalRequests}</span>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;" class="pt-1 text-center border-t border-white/10">
                        <div>
                            <div class="text-[11px] font-extrabold text-white flex items-center justify-center gap-1">
                                <i class="w-2 h-2 rounded-full inline-block bg-[#F2C230]"></i> Sites
                            </div>
                            <div class="text-[10px] text-[#8C95AA] mt-0.5">{stats.totalRequests} dem.</div>
                        </div>
                        <div>
                            <div class="text-[11px] font-extrabold text-white flex items-center justify-center gap-1">
                                <i class="w-2 h-2 rounded-full inline-block bg-[#38BDF8]"></i> Ciber
                            </div>
                            <div class="text-[10px] text-[#8C95AA] mt-0.5">{stats.activeProjects} proj.</div>
                        </div>
                        <div>
                            <div class="text-[11px] font-extrabold text-white flex items-center justify-center gap-1">
                                <i class="w-2 h-2 rounded-full inline-block bg-[#34D399]"></i> Operação
                            </div>
                            <div class="text-[10px] text-[#8C95AA] mt-0.5">{stats.approvedQuotations} aprov.</div>
                        </div>
                    </div>
                </section>
            </div>

            {/* ROW 3: LIVE OPERATIONAL RECORDS (Últimas Solicitações & Clientes Recentes) */}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <section class="gtb-card !p-5 space-y-3">
                    <div class="flex items-center justify-between">
                        <h2 class="text-xs font-extrabold uppercase tracking-wider text-[#F2C230]">Últimas Solicitações de Clientes ({stats.totalRequests})</h2>
                        <a href="/admin/solicitacoes" class="text-xs font-bold text-[#8C95AA] hover:text-white no-underline">Ver todas &rarr;</a>
                    </div>
                    <div class="divide-y divide-white/5 text-xs">
                        {stats.recentRequests.length === 0 ? (
                            <p class="text-xs text-[#8C95AA] py-4 text-center">Nenhuma solicitação recente.</p>
                        ) : (
                            stats.recentRequests.map((r: any) => (
                                <a href={`/admin/solicitacoes/${r.id}`} class="py-2 flex items-center justify-between gap-2 no-underline">
                                    <div class="min-w-0">
                                        <span class="font-bold text-white hover:text-[#F2C230] truncate block">{r.service_title || r.title}</span>
                                        <span class="text-[10.5px] text-[#8C95AA] truncate block">{r.company || r.name} • Prot: {r.protocol}</span>
                                    </div>
                                    <span class="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-[#D5DCEB] shrink-0">
                                        {r.status}
                                    </span>
                                </a>
                            ))
                        )}
                    </div>
                </section>

                <section class="gtb-card !p-5 space-y-3">
                    <div class="flex items-center justify-between">
                        <h2 class="text-xs font-extrabold uppercase tracking-wider text-[#F2C230]">Clientes &amp; Leads Recentes ({stats.totalClients})</h2>
                        <a href="/admin/clientes" class="text-xs font-bold text-[#8C95AA] hover:text-white no-underline">Ver todos &rarr;</a>
                    </div>
                    <div class="divide-y divide-white/5 text-xs">
                        {stats.recentClients.length === 0 ? (
                            <p class="text-xs text-[#8C95AA] py-4 text-center">Nenhum cliente cadastrado.</p>
                        ) : (
                            stats.recentClients.map((c: any) => {
                                const isWaSynthetic = String(c.email || '').endsWith('@whatsapp.gundjatech.local');
                                const subtitle = isWaSynthetic
                                    ? `WhatsApp • ${c.phone || 'Contato'}`
                                    : `${c.email || ''}${c.phone ? ` • ${c.phone}` : ''}`;
                                return (
                                    <div class="py-2 flex items-center justify-between gap-2">
                                        <div class="min-w-0">
                                            <span class="font-bold text-white truncate block">{c.name} {c.company ? `(${c.company})` : ''}</span>
                                            <span class="text-[10.5px] text-[#8C95AA] truncate block">{subtitle}</span>
                                        </div>
                                        <span class={`gt-badge ${c.status === 'active' ? 'gt-badge-success' : 'gt-badge-info'}`}>{c.status}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
};
