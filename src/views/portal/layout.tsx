import type { FC, PropsWithChildren } from 'hono/jsx';
import { resolveToastMeta } from '../../lib/toast';
import { GT_ADMIN_CSS_VERSION, GT_TAILWIND_CSS_VERSION } from '../../lib/assets';

interface PortalLayoutProps {
    title?: string;
    activeNav?: string;
    currentUser: {
        id: number;
        name: string;
        email: string;
        role: string;
    };
    clientName?: string;
    successMessage?: string | null;
    errorMessage?: string | null;
}

export const PortalLayout: FC<PropsWithChildren<PortalLayoutProps>> = ({
    title = 'Portal do Cliente • GundjaTech',
    activeNav = 'dashboard',
    currentUser,
    clientName,
    successMessage,
    errorMessage,
    children
}) => {
    const initials = (currentUser.name || 'GT').slice(0, 2).toUpperCase();
    const displayName = clientName || currentUser.name;
    const headerTitle = title.split('•')[0].trim() || 'Início & Resumo';

    return (
        <html lang="pt-BR" class="h-full" data-admin-theme="light">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>{title}</title>
                <link rel="icon" type="image/svg+xml" href="/img/favicon.svg?v=gt-icon4" />
                <link rel="icon" href="/favicon.ico?v=gt-icon4" sizes="any" />
                <link rel="icon" href="/img/favicon-32x32.png?v=gt-icon4" type="image/png" sizes="32x32" />
                <link rel="apple-touch-icon" sizes="180x180" href="/img/apple-touch-icon.png?v=gt-icon4" />
                <meta name="theme-color" content="#063B5C" />
                <link rel="preload" href="/fonts/ZalandoSansExpanded-Regular.woff2" as="font" type="font/woff2" crossOrigin="" />
                <link rel="preload" href="/fonts/ZalandoSansExpanded-Bold.woff2" as="font" type="font/woff2" crossOrigin="" />
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
                <link rel="stylesheet" href={`/css/gt-tailwind.css?v=${GT_TAILWIND_CSS_VERSION}`} />
                <link rel="stylesheet" href={`/css/gt-admin.css?v=${GT_ADMIN_CSS_VERSION}`} />
                <script src="/jsm/gt-alpine.js?v=1" defer></script>
                <script dangerouslySetInnerHTML={{
                    __html: `
                    (function () {
                        function applyPortalTheme(val) {
                            var theme = val === 'dark' ? 'dark' : 'light';
                            document.documentElement.setAttribute('data-admin-theme', theme);
                            document.documentElement.classList.toggle('dark', theme === 'dark');
                            if (document.body) {
                                document.body.classList.toggle('is-light-mode', theme === 'light');
                                document.body.classList.toggle('is-dark-mode', theme === 'dark');
                            }
                            return theme;
                        }
                        window.GT_SetPortalTheme = function (val) {
                            var theme = applyPortalTheme(val);
                            try { localStorage.setItem('gt_portal_theme', theme); } catch (e) {}
                            return theme;
                        };
                        var saved = 'light';
                        try { saved = localStorage.getItem('gt_portal_theme') || 'light'; } catch (e) {}
                        applyPortalTheme(saved);

                        function applyPortalSidebar(collapsed, animate) {
                            var isCol = !!collapsed;
                            if (animate) {
                                document.documentElement.classList.add('gt-sidebar-animating');
                                clearTimeout(window.__gtPortalSidebarAnimTimer);
                                window.__gtPortalSidebarAnimTimer = setTimeout(function () {
                                    document.documentElement.classList.remove('gt-sidebar-animating');
                                }, 280);
                            }
                            document.documentElement.setAttribute('data-sidebar-collapsed', isCol ? '1' : '0');
                            var aside = document.getElementById('gt-portal-sidebar');
                            var btn = document.getElementById('gt-portal-collapse-btn');
                            if (aside) aside.classList.toggle('is-collapsed', isCol);
                            if (document.body) document.body.classList.toggle('gt-sidebar-is-collapsed', isCol);
                            if (btn) btn.setAttribute('title', isCol ? 'Expandir menu' : 'Recolher menu');
                        }
                        var initPortalCollapsed = false;
                        try { initPortalCollapsed = localStorage.getItem('gt_portal_sidebar_collapsed') === '1'; } catch (e) {}
                        document.documentElement.setAttribute('data-sidebar-collapsed', initPortalCollapsed ? '1' : '0');

                        window.GT_TogglePortalSidebar = function () {
                            var next = document.documentElement.getAttribute('data-sidebar-collapsed') !== '1';
                            applyPortalSidebar(next, true);
                            try { localStorage.setItem('gt_portal_sidebar_collapsed', next ? '1' : '0'); } catch (e) {}
                        };
                        document.addEventListener('DOMContentLoaded', function () {
                            applyPortalSidebar(initPortalCollapsed, false);
                        });
                    })();
                ` }} />
            </head>
            <body class="gt-admin-boost font-sans antialiased h-full flex overflow-hidden is-light-mode">
                <script dangerouslySetInnerHTML={{
                    __html: `
                    (function () {
                        var t = document.documentElement.getAttribute('data-admin-theme') || 'light';
                        document.body.classList.toggle('is-light-mode', t === 'light');
                        document.body.classList.toggle('is-dark-mode', t !== 'light');
                    })();
                ` }} />

                {/* Mobile Backdrop */}
                <div
                    id="gt-portal-backdrop"
                    onclick="document.getElementById('gt-portal-sidebar').classList.add('-translate-x-full');this.classList.add('hidden')"
                    class="hidden fixed inset-0 z-40 bg-black/75 backdrop-blur-xs lg:hidden"
                ></div>

                {/* Left Sidebar */}
                <aside
                    id="gt-portal-sidebar"
                    class="gtb-sidebar fixed inset-y-0 left-0 z-50 lg:static lg:inset-0 shrink-0 -translate-x-full lg:translate-x-0 transition-transform duration-200 flex flex-col justify-between"
                >
                    <div class="flex flex-col min-h-0 flex-1 overflow-x-hidden">
                        {/* Brand Header */}
                        <div class="gtb-sidebar-brand-row h-[72px] flex items-center justify-between px-4 shrink-0 border-b border-white/5">
                            <a href="/portal" class="flex items-center gap-2.5 no-underline">
                                <span class="gtb-brand-badge">
                                    <img src="/img/favicon.svg?v=gt-icon4" alt="GundjaTech" class="w-5 h-5 object-contain" />
                                </span>
                                <span class="gt-font-display gtb-brand-word text-sm font-bold tracking-tight text-white">
                                    Gundja<span class="gtb-brand-tech text-[#F2C230] font-normal">Tech</span>
                                </span>
                            </a>
                            <button
                                type="button"
                                onclick="document.getElementById('gt-portal-sidebar').classList.add('-translate-x-full');document.getElementById('gt-portal-backdrop').classList.add('hidden')"
                                class="text-gray-400 hover:text-white lg:hidden p-1"
                                aria-label="Fechar menu"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Active Client Workspace Card */}
                        <div class="gt-portal-workspace-card mx-3 mt-3 mb-1 px-3.5 py-3 rounded-xl">
                            <div class="flex items-center justify-between gap-2">
                                <span class="gt-portal-ws-label text-[10px] font-extrabold uppercase tracking-wider">Área do Cliente</span>
                                <span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Online
                                </span>
                            </div>
                            <div class="gt-portal-ws-name text-xs font-extrabold truncate mt-1" title={displayName}>
                                {displayName}
                            </div>
                        </div>

                        <div class="gtb-section-head">
                            <span>Visão Geral</span>
                        </div>

                        <nav class="px-3 space-y-1 overflow-y-auto flex-1">
                            <a href="/portal" class={`gtb-nav-item ${activeNav === 'dashboard' ? 'is-active' : ''}`} title="Início & Resumo">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                                    <span>Início &amp; Resumo</span>
                                </div>
                            </a>

                            <div class="gtb-section-head gtb-section-head-divided">
                                <span>Projetos &amp; Pedidos</span>
                            </div>

                            <a href="/portal/solicitacoes" class={`gtb-nav-item ${activeNav === 'requests' ? 'is-active' : ''}`} title="Minhas Solicitações">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    <span>Minhas Solicitações</span>
                                </div>
                            </a>

                            <a href="/portal/projetos" class={`gtb-nav-item ${activeNav === 'projects' ? 'is-active' : ''}`} title="Meus Projetos">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                    <span>Meus Projetos</span>
                                </div>
                            </a>

                            <a href="/portal/orcamentos" class={`gtb-nav-item ${activeNav === 'quotations' ? 'is-active' : ''}`} title="Orçamentos Recebidos">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
                                    <span>Orçamentos Recebidos</span>
                                </div>
                            </a>

                            <div class="gtb-section-head gtb-section-head-divided">
                                <span>Ativos &amp; Suporte</span>
                            </div>

                            <a href="/portal/dominios" class={`gtb-nav-item ${activeNav === 'domains' ? 'is-active' : ''}`} title="Meus Domínios">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                    <span>Meus Domínios</span>
                                </div>
                            </a>

                            <a href="/portal/campanhas" class={`gtb-nav-item ${activeNav === 'campaigns' ? 'is-active' : ''}`} title="Tráfego & Anúncios">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                    <span>Tráfego &amp; Anúncios</span>
                                </div>
                            </a>

                            <a href="/portal/financeiro" class={`gtb-nav-item ${activeNav === 'finance' ? 'is-active' : ''}`} title="Financeiro & Faturas">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                    <span>Financeiro &amp; Faturas</span>
                                </div>
                            </a>

                            <a href="/portal/atendimento" class={`gtb-nav-item ${activeNav === 'chat' ? 'is-active' : ''}`} title="Falar com Atendimento">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                    <span>Falar com Atendimento</span>
                                </div>
                            </a>
                        </nav>
                    </div>

                    {/* Sidebar Footer / User Info */}
                    <div class="gtb-sidebar-footer-collapse">
                        <button
                            type="button"
                            id="gt-portal-collapse-btn"
                            onclick="window.GT_TogglePortalSidebar && window.GT_TogglePortalSidebar()"
                            class="gtb-sidebar-collapse-btn gtb-sidebar-footer-toggle"
                            title="Recolher menu"
                            aria-label="Recolher ou expandir menu lateral"
                        >
                            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect width="18" height="18" x="3" y="3" rx="2" />
                                <path d="M9 3v18" />
                                <path d="m15 9-3 3 3 3" />
                            </svg>
                            <span class="gtb-collapse-label">Recolher menu</span>
                        </button>
                    </div>

                    <div class="gt-portal-sidebar-footer">
                        <div class="gt-portal-footer-card">
                            <a href="/minha-conta" class="gt-portal-footer-user" title="Minha Conta">
                                <span class="gt-portal-footer-avatar">{initials}</span>
                                <div class="min-w-0 flex-1">
                                    <div class="gt-portal-user-name text-xs font-extrabold truncate">{currentUser.name}</div>
                                    <div class="gt-portal-user-email text-[10.5px] truncate">{currentUser.email}</div>
                                </div>
                            </a>
                            <form action="/auth/logout" method="post" class="m-0 shrink-0">
                                <button
                                    type="submit"
                                    title="Sair do Portal"
                                    aria-label="Sair do Portal"
                                    class="gt-portal-logout-btn"
                                >
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                </button>
                            </form>
                        </div>
                    </div>
                </aside>

                {/* Main Workspace Area */}
                <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
                    <header class="gtb-topbar relative z-[80]">
                        <div class="gtb-topbar-left flex items-center gap-2.5 sm:gap-3 min-w-0">
                            <button
                                type="button"
                                onclick="document.getElementById('gt-portal-sidebar').classList.toggle('-translate-x-full');document.getElementById('gt-portal-backdrop').classList.toggle('hidden')"
                                class="gtb-mobile-toggle gt-mobile-toggle gtb-icon-btn rounded-xl shrink-0 lg:hidden"
                                aria-label="Alternar Menu"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                            </button>
                            <h1 class="gt-font-display text-base sm:text-lg font-bold tracking-tight truncate">
                                {headerTitle}
                            </h1>
                        </div>

                        <div class="gtb-topbar-right flex items-center justify-end gap-2 sm:gap-3 shrink-0">
                            {/* Theme / Mode Toggle Pill */}
                            <div class="gtb-theme-switch" role="group" aria-label="Alternar entre modo claro e modo escuro">
                                <button
                                    type="button"
                                    data-theme-orb="light"
                                    onclick="window.GT_SetPortalTheme && window.GT_SetPortalTheme('light')"
                                    class="gtb-theme-orb cursor-pointer border-0"
                                    title="Modo Claro"
                                >
                                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" /></svg>
                                </button>
                                <button
                                    type="button"
                                    data-theme-orb="dark"
                                    onclick="window.GT_SetPortalTheme && window.GT_SetPortalTheme('dark')"
                                    class="gtb-theme-orb cursor-pointer border-0"
                                    title="Modo Escuro"
                                >
                                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
                                </button>
                            </div>

                            {/* Central de Notificações do Cliente (mesmo padrão visual do Admin) */}
                            <div class="relative">
                                <button
                                    type="button"
                                    id="gt-portal-bell-btn"
                                    onclick="document.getElementById('gt-portal-notif-dropdown').classList.toggle('hidden')"
                                    class="gtb-icon-btn relative cursor-pointer"
                                    title="Central de Notificações"
                                    aria-label="Abrir notificações"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                    <span id="gt-portal-bell-dot" class="hidden absolute top-2 right-2.5 w-2 h-2 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399]"></span>
                                </button>

                                <div
                                    id="gt-portal-notif-dropdown"
                                    style="z-index: 120; width: min(24rem, calc(100vw - 2rem));"
                                    class="hidden gtb-dropdown gtb-notif-panel absolute right-0 mt-2.5 rounded-2xl shadow-2xl z-[120] overflow-hidden"
                                >
                                    <div class="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
                                        <div class="flex items-center gap-2">
                                            <span class="w-2 h-2 rounded-full bg-[#F2C230]"></span>
                                            <span class="gt-font-display text-xs font-extrabold text-white whitespace-nowrap">Central de Notificações</span>
                                        </div>
                                        <button type="button" id="gt-portal-notif-clear-all" class="hidden text-[10.5px] font-bold text-[#8C95AA] hover:text-[#F2C230] transition cursor-pointer">
                                            Limpar tudo
                                        </button>
                                    </div>
                                    <div id="gt-portal-notif-list" class="max-h-80 overflow-y-auto divide-y divide-white/5">
                                        <div class="gtb-notif-empty px-6 py-8 flex flex-col items-center text-center">
                                            <span class="gtb-notif-empty-icon">
                                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M5 13l4 4L19 7" /></svg>
                                            </span>
                                            <div class="mt-3 text-[13px] font-extrabold text-white">Carregando notificações...</div>
                                        </div>
                                    </div>
                                    <div class="px-4 py-2.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-2 text-[11px] font-bold">
                                        <a href="/portal/orcamentos" class="text-[#F2C230] hover:underline no-underline whitespace-nowrap">Ver Orçamentos →</a>
                                        <a href="/portal/financeiro" class="text-[#D5DCEB] hover:text-[#F2C230] hover:underline no-underline ml-auto whitespace-nowrap">Ver Financeiro →</a>
                                    </div>
                                </div>
                            </div>

                            <a href="/portal/solicitacoes/nova" class="gt-btn-primary gt-btn-sm">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
                                <span class="hidden sm:inline">Nova Solicitação</span>
                                <span class="sm:hidden">Solicitar</span>
                            </a>

                            <a href="/" target="_blank" class="gt-btn-outline gt-btn-sm" title="Abrir site institucional">
                                <span class="hidden md:inline">Ir para o Site</span>
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                        </div>
                    </header>

                    {/* Flash Toast Notifications — idêntico ao Painel Admin (Auto-dismiss 5s / 6.5s + pause on hover + URL cleanup) */}
                    {(() => {
                        const okMeta = successMessage ? resolveToastMeta(successMessage, false) : null;
                        const errMeta = errorMessage ? resolveToastMeta(errorMessage, true) : null;
                        return (
                            <div id="gt-flash-toast-stack" class="gt-flash-toast-stack" aria-live="polite">
                                {successMessage && okMeta && (
                                    <div class="gt-flash-toast gt-flash-toast--success" role="status" data-auto-dismiss="5000">
                                        <span class="gt-flash-toast__icon" aria-hidden="true">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.3" d={okMeta.iconPath} /></svg>
                                        </span>
                                        <div class="gt-flash-toast__content">
                                            <div class="gt-flash-toast__title">{okMeta.title}</div>
                                            <div class="gt-flash-toast__msg">{successMessage}</div>
                                        </div>
                                        <button type="button" class="gt-flash-toast__close" aria-label="Fechar notificação" onclick="var t=this.closest('.gt-flash-toast');if(t){t.classList.add('is-leaving');setTimeout(function(){t.remove();},250);}">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                        <span class="gt-flash-toast__bar"></span>
                                    </div>
                                )}
                                {errorMessage && errMeta && (
                                    <div class={`gt-flash-toast gt-flash-toast--${errMeta.variant}`} role={errMeta.variant === 'error' ? 'alert' : 'status'} data-auto-dismiss="6500">
                                        <span class="gt-flash-toast__icon" aria-hidden="true">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.3" d={errMeta.iconPath} /></svg>
                                        </span>
                                        <div class="gt-flash-toast__content">
                                            <div class="gt-flash-toast__title">{errMeta.title}</div>
                                            <div class="gt-flash-toast__msg">{errorMessage}</div>
                                        </div>
                                        <button type="button" class="gt-flash-toast__close" aria-label="Fechar notificação" onclick="var t=this.closest('.gt-flash-toast');if(t){t.classList.add('is-leaving');setTimeout(function(){t.remove();},250);}">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                        <span class="gt-flash-toast__bar" style="animation-duration: 6.5s;"></span>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Main Content Canvas */}
                    <main class="gt-admin-main flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 space-y-6">
                        {children}
                    </main>
                </div>

                <script dangerouslySetInnerHTML={{
                    __html: `
                    (function () {
                        // Auto-dismiss dos toasts de feedback (?success= / ?error=) + pausa no hover + limpeza da URL (idêntico ao Admin)
                        (function initFlashToasts() {
                            var toasts = document.querySelectorAll('#gt-flash-toast-stack .gt-flash-toast');
                            if (!toasts.length) return;
                            try {
                                var url = new URL(window.location.href);
                                if (url.searchParams.has('success') || url.searchParams.has('error')) {
                                    url.searchParams.delete('success');
                                    url.searchParams.delete('error');
                                    window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
                                }
                            } catch (e) {}
                            toasts.forEach(function (toast) {
                                var remaining = parseInt(toast.getAttribute('data-auto-dismiss') || '5000', 10);
                                var startedAt = Date.now();
                                var timer = null;
                                function dismiss() {
                                    toast.classList.add('is-leaving');
                                    setTimeout(function () { toast.remove(); }, 260);
                                }
                                function start() {
                                    startedAt = Date.now();
                                    timer = setTimeout(dismiss, Math.max(400, remaining));
                                }
                                toast.addEventListener('mouseenter', function () {
                                    if (timer) {
                                        clearTimeout(timer);
                                        timer = null;
                                        remaining -= (Date.now() - startedAt);
                                    }
                                });
                                toast.addEventListener('mouseleave', function () {
                                    if (!timer && remaining > 0) start();
                                });
                                start();
                            });
                        })();

                        // Modal corporativo de confirmação (idêntico ao Admin — substitui window.confirm nativo)
                        function initCorporateConfirmModal() {
                            var overlay = document.getElementById('gt-confirm-modal');
                            if (!overlay || overlay.dataset.gtBound === '1') return;
                            overlay.dataset.gtBound = '1';
                            var titleEl = document.getElementById('gt-confirm-title');
                            var msgEl = document.getElementById('gt-confirm-message');
                            var subEl = document.getElementById('gt-confirm-subnote');
                            var btnCancel = document.getElementById('gt-confirm-cancel');
                            var btnOk = document.getElementById('gt-confirm-ok');
                            var pendingForm = null;

                            function extractConfirmMsg(attrVal) {
                                if (!attrVal) return '';
                                var m = attrVal.match(/confirm\\(\\s*(['"])([\\s\\S]*?)\\1\\s*\\)/);
                                return m ? m[2] : '';
                            }

                            document.querySelectorAll('form[onsubmit*="confirm("]').forEach(function (f) {
                                var msg = extractConfirmMsg(f.getAttribute('onsubmit'));
                                if (msg) {
                                    f.setAttribute('data-confirm', msg);
                                    f.removeAttribute('onsubmit');
                                }
                            });
                            document.querySelectorAll('button[onclick*="confirm("], input[onclick*="confirm("]').forEach(function (b) {
                                var msg = extractConfirmMsg(b.getAttribute('onclick'));
                                var f = b.closest('form');
                                if (msg && f) {
                                    f.setAttribute('data-confirm', msg);
                                    b.removeAttribute('onclick');
                                }
                            });

                            function closeModal() {
                                overlay.classList.remove('is-open');
                                overlay.setAttribute('aria-hidden', 'true');
                                pendingForm = null;
                                if (btnOk) {
                                    btnOk.disabled = false;
                                    btnOk.innerHTML = 'Confirmar';
                                }
                            }

                            function openModal(form, message) {
                                pendingForm = form;
                                var isDelete = /excluir|remover|apagar|deletar/i.test(message);
                                if (titleEl) titleEl.textContent = isDelete ? 'Confirmar Exclusão' : 'Confirmar Ação';
                                if (msgEl) msgEl.textContent = message;
                                if (subEl) subEl.style.display = isDelete ? 'block' : 'none';
                                if (btnOk) {
                                    btnOk.disabled = false;
                                    btnOk.textContent = isDelete ? 'Sim, Excluir' : 'Confirmar';
                                }
                                overlay.classList.add('is-open');
                                overlay.setAttribute('aria-hidden', 'false');
                                if (btnCancel) btnCancel.focus();
                            }

                            document.addEventListener('submit', function (ev) {
                                var form = ev.target;
                                if (!form || form.tagName !== 'FORM') return;
                                var msg = form.getAttribute('data-confirm');
                                if (!msg || form.dataset.gtConfirmed === '1') return;
                                ev.preventDefault();
                                ev.stopImmediatePropagation();
                                openModal(form, msg);
                            }, true);

                            if (btnCancel) btnCancel.addEventListener('click', closeModal);
                            overlay.addEventListener('click', function (ev) {
                                if (ev.target === overlay) closeModal();
                            });
                            document.addEventListener('keydown', function (ev) {
                                if (ev.key === 'Escape' && overlay.classList.contains('is-open')) closeModal();
                            });
                            if (btnOk) {
                                btnOk.addEventListener('click', function () {
                                    if (!pendingForm) return;
                                    var formToRun = pendingForm;
                                    formToRun.dataset.gtConfirmed = '1';
                                    btnOk.disabled = true;
                                    btnOk.innerHTML = '<span class="gt-btn-spinner" aria-hidden="true"></span><span>Processando...</span>';
                                    formToRun.submit();
                                });
                            }
                        }

                        if (document.readyState === 'loading') {
                            document.addEventListener('DOMContentLoaded', initCorporateConfirmModal);
                        } else {
                            setTimeout(initCorporateConfirmModal, 0);
                        }

                        // Feedback visual imediato (spinner + "Processando...") em submits do Portal
                        document.addEventListener('submit', function (ev) {
                            if (ev.defaultPrevented) return;
                            var form = ev.target;
                            if (!form || form.tagName !== 'FORM') return;
                            var btn = ev.submitter || form.querySelector('button[type="submit"], button:not([type])');
                            if (!btn || btn.disabled || btn.classList.contains('gt-btn-loading') || btn.classList.contains('gt-portal-logout-btn')) return;
                            var label = btn.getAttribute('data-loading-text') || 'Processando...';
                            btn.classList.add('gt-btn-loading');
                            btn.setAttribute('aria-busy', 'true');
                            btn.innerHTML = '<span class="gt-btn-spinner" aria-hidden="true"></span><span>' + label + '</span>';
                        }, false);

                        // Helper global para disparar toast corporativo via JS (substitui window.alert)
                        window.GT_ShowToast = function (message, variant) {
                            var stack = document.getElementById('gt-flash-toast-stack');
                            if (!stack || !message) return;
                            var v = variant === 'error' ? 'error' : (variant === 'warning' ? 'warning' : 'success');
                            var title = v === 'error' ? 'Não foi possível concluir' : (v === 'warning' ? 'Atenção' : 'Ação concluída');
                            var iconPath = v === 'error'
                                ? 'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z'
                                : (v === 'warning'
                                    ? 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                                    : 'M5 13l4 4L19 7');
                            var duration = v === 'success' ? 5000 : 6500;
                            var toast = document.createElement('div');
                            toast.className = 'gt-flash-toast gt-flash-toast--' + v;
                            toast.setAttribute('role', v === 'error' ? 'alert' : 'status');
                            toast.innerHTML = '<span class="gt-flash-toast__icon" aria-hidden="true"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.3" d="' + iconPath + '"/></svg></span><div class="gt-flash-toast__content"><div class="gt-flash-toast__title"></div><div class="gt-flash-toast__msg"></div></div><button type="button" class="gt-flash-toast__close" aria-label="Fechar notificação"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12"/></svg></button><span class="gt-flash-toast__bar" style="animation-duration:' + (duration / 1000) + 's;"></span>';
                            toast.querySelector('.gt-flash-toast__title').textContent = title;
                            toast.querySelector('.gt-flash-toast__msg').textContent = String(message);
                            var remaining = duration;
                            var startedAt = Date.now();
                            var timer = null;
                            function dismiss() { toast.classList.add('is-leaving'); setTimeout(function () { toast.remove(); }, 260); }
                            function start() { startedAt = Date.now(); timer = setTimeout(dismiss, Math.max(400, remaining)); }
                            toast.querySelector('.gt-flash-toast__close').addEventListener('click', function () { if (timer) clearTimeout(timer); dismiss(); });
                            toast.addEventListener('mouseenter', function () { if (timer) { clearTimeout(timer); timer = null; remaining -= (Date.now() - startedAt); } });
                            toast.addEventListener('mouseleave', function () { if (!timer && remaining > 0) start(); });
                            stack.appendChild(toast);
                            start();
                        };

                        // Central de Notificações do Portal (polling leve a cada 15s, pausa quando aba está oculta)
                        (function initPortalNotifications() {
                            var P_STORAGE_KEY = 'gt_portal_dismissed_notifs_v1';
                            var clearBtn = document.getElementById('gt-portal-notif-clear-all');
                            var dropdown = document.getElementById('gt-portal-notif-dropdown');
                            var bellBtn = document.getElementById('gt-portal-bell-btn');

                            function getDismissed() {
                                try { return JSON.parse(localStorage.getItem(P_STORAGE_KEY) || '{}') || {}; } catch (e) { return {}; }
                            }
                            function saveDismissed(map) {
                                try { localStorage.setItem(P_STORAGE_KEY, JSON.stringify(map)); } catch (e) {}
                            }

                            document.addEventListener('click', function (ev) {
                                if (!dropdown || dropdown.classList.contains('hidden')) return;
                                if (!dropdown.contains(ev.target) && (!bellBtn || !bellBtn.contains(ev.target))) {
                                    dropdown.classList.add('hidden');
                                }
                            });

                            function renderPortalNotifs(items) {
                                var list = document.getElementById('gt-portal-notif-list');
                                var dot = document.getElementById('gt-portal-bell-dot');
                                if (!list) return;
                                var dismissed = getDismissed();
                                var visible = (items || []).filter(function (it) { return !dismissed[it.key]; });
                                if (dot) dot.classList.toggle('hidden', visible.length === 0);
                                if (clearBtn) clearBtn.classList.toggle('hidden', visible.length === 0);

                                list.innerHTML = '';
                                if (visible.length === 0) {
                                    list.innerHTML = '<div class="gtb-notif-empty px-6 py-8 flex flex-col items-center text-center"><span class="gtb-notif-empty-icon"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M5 13l4 4L19 7"/></svg></span><div class="mt-3 text-[13px] font-extrabold text-white">Tudo em dia por aqui!</div><p class="mt-1 text-[11.5px] leading-relaxed text-[#8C95AA] max-w-[16rem]">Nenhum orçamento, fatura ou mensagem pendente no momento.</p></div>';
                                    return;
                                }
                                visible.forEach(function (item) {
                                    var row = document.createElement('a');
                                    row.href = item.url || '#';
                                    row.className = 'gtb-notif-item flex items-start gap-3 px-4 py-3 transition no-underline';
                                    row.dataset.notifKey = item.key || '';
                                    row.innerHTML = '<div class="min-w-0 flex-1"><div class="flex items-center justify-between gap-2"><span class="text-xs font-bold text-white truncate"></span><span class="text-[9.5px] text-[#8C95AA] shrink-0"></span></div><p class="text-[11px] text-[#8C95AA] truncate mt-0.5"></p></div>';
                                    row.querySelector('.text-white').textContent = item.title || '';
                                    row.querySelector('.shrink-0').textContent = item.time || '';
                                    row.querySelector('p').textContent = item.subtitle || '';
                                    row.addEventListener('click', function () {
                                        if (item.key) {
                                            var map = getDismissed();
                                            map[item.key] = true;
                                            saveDismissed(map);
                                        }
                                    });
                                    list.appendChild(row);
                                });
                            }

                            if (clearBtn) {
                                clearBtn.addEventListener('click', function (ev) {
                                    ev.preventDefault();
                                    var list = document.getElementById('gt-portal-notif-list');
                                    var map = getDismissed();
                                    if (list) {
                                        list.querySelectorAll('.gtb-notif-item').forEach(function (row) {
                                            map[row.dataset.notifKey || ''] = true;
                                        });
                                    }
                                    saveDismissed(map);
                                    renderPortalNotifs([]);
                                });
                            }

                            var pollTimer = null;
                            function schedulePoll(ms) {
                                clearTimeout(pollTimer);
                                pollTimer = setTimeout(fetchPortalNotifs, ms);
                            }
                            document.addEventListener('visibilitychange', function () {
                                if (!document.hidden) schedulePoll(300);
                            });

                            async function fetchPortalNotifs() {
                                if (document.hidden) {
                                    schedulePoll(20000);
                                    return;
                                }
                                try {
                                    var resp = await fetch('/portal/notificacoes/resumo', { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' });
                                    if (resp.ok) {
                                        var data = await resp.json();
                                        if (data && data.ok) renderPortalNotifs(data.notifications || []);
                                    }
                                } catch (e) {
                                } finally {
                                    schedulePoll(15000);
                                }
                            }

                            fetchPortalNotifs();
                        })();
                    })();
                ` }} />

                {/* Modal Global Corporativo de Confirmação (idêntico ao Admin) */}
                <div id="gt-confirm-modal" class="gt-confirm-overlay" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="gt-confirm-title">
                    <div class="gt-confirm-dialog">
                        <div class="gt-confirm-header">
                            <div class="gt-confirm-icon" aria-hidden="true">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M3 6h18" />
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                    <line x1="10" x2="10" y1="11" y2="17" />
                                    <line x1="14" x2="14" y1="11" y2="17" />
                                </svg>
                            </div>
                            <div class="min-w-0 flex-1">
                                <h3 id="gt-confirm-title" class="gt-confirm-title">Confirmar Ação</h3>
                                <p id="gt-confirm-message" class="gt-confirm-message">Deseja realmente continuar com esta ação?</p>
                                <p id="gt-confirm-subnote" class="gt-confirm-subnote">Esta ação é permanente e não poderá ser desfeita.</p>
                            </div>
                        </div>
                        <div class="gt-confirm-actions">
                            <button type="button" id="gt-confirm-cancel" class="gt-btn-outline gt-btn-sm">
                                Cancelar
                            </button>
                            <button type="button" id="gt-confirm-ok" class="gt-btn-danger-solid">
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
};
