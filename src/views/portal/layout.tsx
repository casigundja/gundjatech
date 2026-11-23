import type { FC, PropsWithChildren } from 'hono/jsx';
import { resolveToastMeta } from '../../lib/toast';

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
                <link rel="stylesheet" href="/css/gt-tailwind.css?v=1" />
                <link rel="stylesheet" href="/css/gt-admin.css?v=64" />
                <script src="/jsm/gt-alpine.js?v=1" defer></script>
                <script dangerouslySetInnerHTML={{ __html: `
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
                <script dangerouslySetInnerHTML={{ __html: `
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
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
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
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
                                    <span>Início &amp; Resumo</span>
                                </div>
                            </a>

                            <div class="gtb-section-head gtb-section-head-divided">
                                <span>Projetos &amp; Pedidos</span>
                            </div>

                            <a href="/portal/solicitacoes" class={`gtb-nav-item ${activeNav === 'requests' ? 'is-active' : ''}`} title="Minhas Solicitações">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                    <span>Minhas Solicitações</span>
                                </div>
                            </a>

                            <a href="/portal/projetos" class={`gtb-nav-item ${activeNav === 'projects' ? 'is-active' : ''}`} title="Meus Projetos">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                                    <span>Meus Projetos</span>
                                </div>
                            </a>

                            <a href="/portal/orcamentos" class={`gtb-nav-item ${activeNav === 'quotations' ? 'is-active' : ''}`} title="Orçamentos Recebidos">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/></svg>
                                    <span>Orçamentos Recebidos</span>
                                </div>
                            </a>

                            <div class="gtb-section-head gtb-section-head-divided">
                                <span>Ativos &amp; Suporte</span>
                            </div>

                            <a href="/portal/dominios" class={`gtb-nav-item ${activeNav === 'domains' ? 'is-active' : ''}`} title="Meus Domínios">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
                                    <span>Meus Domínios</span>
                                </div>
                            </a>

                            <a href="/portal/campanhas" class={`gtb-nav-item ${activeNav === 'campaigns' ? 'is-active' : ''}`} title="Tráfego & Anúncios">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                                    <span>Tráfego &amp; Anúncios</span>
                                </div>
                            </a>

                            <a href="/portal/financeiro" class={`gtb-nav-item ${activeNav === 'finance' ? 'is-active' : ''}`} title="Financeiro & Faturas">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                                    <span>Financeiro &amp; Faturas</span>
                                </div>
                            </a>

                            <a href="/portal/atendimento" class={`gtb-nav-item ${activeNav === 'chat' ? 'is-active' : ''}`} title="Falar com Atendimento">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
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
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
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
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
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
                                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/></svg>
                                </button>
                                <button
                                    type="button"
                                    data-theme-orb="dark"
                                    onclick="window.GT_SetPortalTheme && window.GT_SetPortalTheme('dark')"
                                    class="gtb-theme-orb cursor-pointer border-0"
                                    title="Modo Escuro"
                                >
                                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
                                </button>
                            </div>

                            <a href="/portal/solicitacoes/nova" class="gt-btn-primary gt-btn-sm">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
                                <span class="hidden sm:inline">Nova Solicitação</span>
                                <span class="sm:hidden">Solicitar</span>
                            </a>

                            <a href="/" target="_blank" class="gt-btn-outline gt-btn-sm" title="Abrir site institucional">
                                <span class="hidden md:inline">Ir para o Site</span>
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                            </a>
                        </div>
                    </header>

                    {/* Flash Toasts */}
                    {(successMessage || errorMessage) && (() => {
                        const okMeta = successMessage ? resolveToastMeta(successMessage, false) : null;
                        const errMeta = errorMessage ? resolveToastMeta(errorMessage, true) : null;
                        return (
                            <div id="gt-flash-toast-stack" class="gt-toast-stack" role="status" aria-live="polite">
                                {successMessage && okMeta && (
                                    <div class="gt-flash-toast gt-flash-toast-success" data-auto-dismiss="5000">
                                        <div class="gt-flash-toast-icon">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.3" d={okMeta.iconPath}/></svg>
                                        </div>
                                        <div class="gt-flash-toast-content">
                                            <div class="gt-flash-toast-title">{okMeta.title}</div>
                                            <div class="gt-flash-toast-text">{successMessage}</div>
                                        </div>
                                        <button type="button" class="gt-flash-toast-close" onclick="this.closest('.gt-flash-toast').remove()" aria-label="Fechar">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                        </button>
                                        <div class="gt-flash-toast-bar"></div>
                                    </div>
                                )}
                                {errorMessage && errMeta && (
                                    <div class="gt-flash-toast gt-flash-toast-error" data-auto-dismiss="6500">
                                        <div class="gt-flash-toast-icon">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.3" d={errMeta.iconPath}/></svg>
                                        </div>
                                        <div class="gt-flash-toast-content">
                                            <div class="gt-flash-toast-title">{errMeta.title}</div>
                                            <div class="gt-flash-toast-text">{errorMessage}</div>
                                        </div>
                                        <button type="button" class="gt-flash-toast-close" onclick="this.closest('.gt-flash-toast').remove()" aria-label="Fechar">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                        </button>
                                        <div class="gt-flash-toast-bar"></div>
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

                <script dangerouslySetInnerHTML={{ __html: `
                    (function () {
                        var toasts = document.querySelectorAll('.gt-flash-toast[data-auto-dismiss]');
                        toasts.forEach(function (t) {
                            var ms = parseInt(t.getAttribute('data-auto-dismiss') || '5000', 10);
                            setTimeout(function () {
                                t.classList.add('is-leaving');
                                setTimeout(function () { t.remove(); }, 260);
                            }, ms);
                        });
                    })();
                ` }} />
            </body>
        </html>
    );
};
