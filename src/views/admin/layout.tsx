import type { FC, PropsWithChildren } from 'hono/jsx';

interface AdminLayoutProps {
    title?: string;
    activeNav?: string;
    currentUser: {
        id: number;
        name: string;
        email: string;
        role: string;
    };
    successMessage?: string | null;
    errorMessage?: string | null;
}

export const AdminLayout: FC<PropsWithChildren<AdminLayoutProps>> = ({
    title = 'Painel Administrativo • GundjaTech',
    activeNav = 'dashboard',
    currentUser,
    successMessage,
    errorMessage,
    children
}) => {
    const initials = (currentUser.name || 'GT').slice(0, 2).toUpperCase();
    const headerTitle = title.split('•')[0].trim() || 'Dashboard';

    return (
        <html lang="pt-BR" class="h-full dark">
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
                <link rel="stylesheet" href="/css/gt-admin.css?v=28" />
                <script src="/jsm/gt-alpine.js?v=1" defer></script>
                <script dangerouslySetInnerHTML={{ __html: `
                    (function () {
                        function applyAdminTheme(val) {
                            var theme = val === 'light' ? 'light' : 'dark';
                            document.documentElement.setAttribute('data-admin-theme', theme);
                            document.documentElement.classList.toggle('dark', theme === 'dark');
                            if (document.body) {
                                document.body.classList.toggle('is-light-mode', theme === 'light');
                                document.body.classList.toggle('is-dark-mode', theme === 'dark');
                            }
                            return theme;
                        }
                        window.GT_SetAdminTheme = function (val) {
                            var theme = applyAdminTheme(val);
                            try { localStorage.setItem('gt_admin_theme', theme); } catch (e) {}
                            return theme;
                        };
                        var saved = 'dark';
                        try { saved = localStorage.getItem('gt_admin_theme') || 'dark'; } catch (e) {}
                        applyAdminTheme(saved);
                    })();
                ` }} />
                <style dangerouslySetInnerHTML={{ __html: `
                    :root {
                        --gt-gold: #F2C230;
                        --gt-dark: #063B5C;
                        --gt-darker: #032135;
                        --gt-blue: #16749A;
                        --gt-ice: #E7F0F5;
                        --gt-white: #FFFFFF;
                        --gt-border: rgba(22, 116, 154, 0.35);
                        --gt-card-bg: #052c46;
                    }
                    .gt-card {
                        background: var(--gtb-card, #111623);
                        border: 1px solid var(--gtb-border, rgba(255,255,255,0.08));
                        border-radius: 16px;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                    }
                    html[data-admin-theme="light"] .gt-card {
                        background: #FFFFFF !important;
                        border-color: #D4E3ED !important;
                        color: #063B5C !important;
                    }
                    .gt-btn-primary {
                        background: var(--gt-gold);
                        color: #063B5C !important;
                        font-weight: 800;
                        padding: 10px 18px;
                        border-radius: 10px;
                        text-decoration: none;
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        border: none;
                        cursor: pointer;
                        font-size: 13px;
                        transition: background 0.15s ease;
                    }
                    .gt-btn-primary:hover { background: #E0B020; }
                    .gt-btn-outline {
                        background: transparent;
                        color: #E7F0F5;
                        font-weight: 700;
                        padding: 8px 16px;
                        border-radius: 10px;
                        text-decoration: none;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 7px;
                        white-space: nowrap;
                        line-height: 1;
                        border: 1px solid var(--gt-border);
                        cursor: pointer;
                        font-size: 13px;
                        transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
                    }
                    .gt-btn-outline:hover {
                        background: rgba(22, 116, 154, 0.2);
                        color: #FFFFFF;
                    }
                    .gt-alert-success {
                        background: rgba(16, 185, 129, 0.15);
                        border: 1px solid rgba(16, 185, 129, 0.4);
                        color: #6EE7B7;
                        padding: 12px 16px;
                        border-radius: 12px;
                        margin-bottom: 20px;
                        font-size: 13px;
                        font-weight: 600;
                    }
                    .gt-alert-error {
                        background: rgba(239, 68, 68, 0.15);
                        border: 1px solid rgba(239, 68, 68, 0.4);
                        color: #FCA5A5;
                        padding: 12px 16px;
                        border-radius: 12px;
                        margin-bottom: 20px;
                        font-size: 13px;
                        font-weight: 600;
                    }
                    .gt-badge {
                        display: inline-block;
                        padding: 4px 10px;
                        border-radius: 6px;
                        font-size: 11px;
                        font-weight: 700;
                        text-transform: uppercase;
                    }
                    .gt-badge-success { background: rgba(16, 185, 129, 0.2); color: #34D399; }
                    .gt-badge-warning { background: rgba(245, 158, 11, 0.2); color: #FBBF24; }
                    .gt-badge-info { background: rgba(59, 130, 246, 0.2); color: #60A5FA; }
                    .gt-badge-danger { background: rgba(239, 68, 68, 0.2); color: #F87171; }
                ` }} />
            </head>
            <body class="gt-admin-boost font-sans antialiased h-full flex overflow-hidden is-dark-mode">
                <script dangerouslySetInnerHTML={{ __html: `
                    (function () {
                        var t = document.documentElement.getAttribute('data-admin-theme') || 'dark';
                        document.body.classList.toggle('is-light-mode', t === 'light');
                        document.body.classList.toggle('is-dark-mode', t !== 'light');
                    })();
                ` }} />

                {/* Mobile Backdrop */}
                <div
                    id="gt-admin-backdrop"
                    onclick="document.getElementById('gt-admin-sidebar').classList.add('-translate-x-full');this.classList.add('hidden')"
                    class="hidden fixed inset-0 z-40 bg-black/75 backdrop-blur-xs lg:hidden"
                ></div>

                {/* Left Sidebar */}
                <aside
                    id="gt-admin-sidebar"
                    class="gtb-sidebar fixed inset-y-0 left-0 z-50 lg:static lg:inset-0 shrink-0 -translate-x-full lg:translate-x-0 transition-transform duration-200"
                >
                    <div class="flex flex-col min-h-0 flex-1">
                        {/* Brand Header */}
                        <div class="h-[72px] flex items-center justify-between px-4 shrink-0">
                            <a href="/admin/dashboard" class="flex items-center gap-2.5 no-underline">
                                <span class="gtb-brand-badge">
                                    <img src="/img/favicon.svg?v=gt-icon4" alt="GundjaTech" class="w-5 h-5 object-contain" />
                                </span>
                                <span class="gt-font-display gtb-brand-word text-sm font-bold tracking-tight text-white">
                                    Gundja<span class="gtb-brand-tech text-[#F2C230] font-normal">Tech</span>
                                </span>
                            </a>
                            <button
                                type="button"
                                onclick="document.getElementById('gt-admin-sidebar').classList.add('-translate-x-full');document.getElementById('gt-admin-backdrop').classList.add('hidden')"
                                class="text-gray-400 hover:text-white lg:hidden p-1"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>

                        <div class="gtb-section-head">
                            <span>Menu Principal</span>
                        </div>

                        <nav class="px-3 space-y-1 overflow-y-auto flex-1">
                            <a href="/admin/dashboard" class={`gtb-nav-item ${activeNav === 'dashboard' ? 'is-active' : ''}`} title="Dashboard">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
                                    <span>Dashboard</span>
                                </div>
                            </a>

                            <a href="/admin/campanhas" class={`gtb-nav-item ${activeNav === 'campaigns' ? 'is-active' : ''}`} title="Tráfego & Analytics">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                                    <span>Tráfego &amp; Analytics</span>
                                </div>
                            </a>

                            <a href="/admin/financeiro" class={`gtb-nav-item ${activeNav === 'finance' ? 'is-active' : ''}`} title="Receita & Caixa">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                                    <span>Receita &amp; Caixa</span>
                                </div>
                            </a>

                            <a href="/admin/projetos" class={`gtb-nav-item ${activeNav === 'projects' ? 'is-active' : ''}`} title="Projetos">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                                    <span>Projetos</span>
                                </div>
                                <span class="gtb-badge-pill">PRO</span>
                            </a>

                            <a href="/admin/servicos" class={`gtb-nav-item ${activeNav === 'services' ? 'is-active' : ''}`} title="Serviços & Soluções">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"/></svg>
                                    <span>Serviços &amp; Soluções</span>
                                </div>
                            </a>

                            <a href="/admin/clientes" class={`gtb-nav-item ${activeNav === 'clients' ? 'is-active' : ''}`} title="Clientes">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                    <span>Clientes</span>
                                </div>
                            </a>

                            <a href="/admin/solicitacoes" class={`gtb-nav-item ${activeNav === 'requests' ? 'is-active' : ''}`} title="Solicitações">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                    <span>Solicitações</span>
                                </div>
                                <span id="gt-sidebar-requests-badge" class="gtb-count-circle hidden">0</span>
                            </a>

                            <div class="gtb-section-head pt-4 border-t border-white/5 mt-2">
                                <span>Workspaces</span>
                            </div>

                            <a href="/admin/orcamentos" class={`gtb-nav-item ${activeNav === 'quotations' ? 'is-active' : ''}`} title="Orçamentos">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                                    <span>Orçamentos</span>
                                </div>
                            </a>

                            <a href="/admin/dominios" class={`gtb-nav-item ${activeNav === 'domains' ? 'is-active' : ''}`} title="Domínios & DNS">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
                                    <span>Domínios &amp; DNS</span>
                                </div>
                            </a>

                            <a href="/admin/usuarios" class={`gtb-nav-item ${activeNav === 'users' ? 'is-active' : ''}`} title="Equipe & Usuários">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                                    <span>Equipe &amp; Usuários</span>
                                </div>
                            </a>

                            <div class="pt-3 mt-2 border-t border-white/5 space-y-1">
                                <a href="/admin/crm-autonomo" class={`gtb-nav-item ${activeNav === 'crm' ? 'is-active' : ''}`} title="CRM Autônomo IA">
                                    <div class="flex items-center gap-3">
                                        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                                        <span>CRM Autônomo IA</span>
                                    </div>
                                    <span class="gtb-badge-pill">AUTO</span>
                                </a>

                                <a href="/admin/atendimento" class={`gtb-nav-item ${activeNav === 'chat' ? 'is-active' : ''}`} title="Suporte & Chat">
                                    <div class="flex items-center gap-3">
                                        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                        <span>Suporte &amp; Chat</span>
                                    </div>
                                    <span id="gt-sidebar-chats-badge" class="gtb-count-circle hidden">0</span>
                                </a>

                                <a href="/admin/configuracoes" class={`gtb-nav-item ${activeNav === 'settings' ? 'is-active' : ''}`} title="Configurações">
                                    <div class="flex items-center gap-3">
                                        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
                                        <span>Configurações</span>
                                    </div>
                                </a>
                            </div>
                        </nav>
                    </div>

                    <div class="gtb-promo-card">
                        <div class="text-[10.5px] font-bold tracking-wider uppercase text-white/90 leading-snug">
                            GESTÃO OPERACIONAL<br />
                            <strong class="text-[#F2C230]">GUNDJATECH PRO ✦</strong>
                        </div>
                        <a href="/admin/solicitacoes" class="gtb-promo-btn">
                            <span>Ver Solicitações</span>
                            <span class="text-[#E4A318]">♛</span>
                        </a>
                    </div>
                </aside>

                {/* Main Workspace Area */}
                <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
                    <header class="gtb-topbar relative z-[80]" style="position: relative; z-index: 80;">
                        <div class="gtb-topbar-left flex items-center gap-2 sm:gap-3 min-w-0 shrink-0 md:shrink">
                            <button
                                type="button"
                                onclick="document.getElementById('gt-admin-sidebar').classList.toggle('-translate-x-full');document.getElementById('gt-admin-backdrop').classList.toggle('hidden')"
                                class="gtb-mobile-toggle gt-mobile-toggle gtb-icon-btn rounded-xl shrink-0"
                                aria-label="Abrir menu"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                            </button>
                            <h1 class="gt-font-display gtb-topbar-title hidden md:block text-lg sm:text-xl font-bold tracking-tight truncate">
                                {headerTitle}
                            </h1>
                        </div>

                        <div class="gtb-topbar-right flex items-center justify-end gap-1.5 sm:gap-3 flex-1 md:flex-initial min-w-0">
                            {/* Search Box with ⌘ F Pill */}
                            <form action="/admin/solicitacoes" method="get" class="gtb-search-box flex-1 md:flex-initial min-w-0">
                                <svg class="w-4 h-4 text-[#8C95AA] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                <input type="text" name="search" placeholder="Pesquisar demandas, clientes..." aria-label="Pesquisar" />
                                <span class="gtb-kbd-pill hidden lg:inline-flex">⌘ F</span>
                            </form>

                            {/* Theme / Mode Toggle Pill */}
                            <div class="gtb-theme-switch" role="group" aria-label="Alternar entre modo claro e modo escuro">
                                <button
                                    type="button"
                                    data-theme-orb="light"
                                    onclick="window.GT_SetAdminTheme && window.GT_SetAdminTheme('light')"
                                    class="gtb-theme-orb cursor-pointer border-0"
                                    title="Modo Claro"
                                    aria-label="Ativar modo claro"
                                >
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                                </button>
                                <button
                                    type="button"
                                    data-theme-orb="dark"
                                    onclick="window.GT_SetAdminTheme && window.GT_SetAdminTheme('dark')"
                                    class="gtb-theme-orb cursor-pointer border-0"
                                    title="Modo Escuro"
                                    aria-label="Ativar modo escuro"
                                >
                                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
                                </button>
                            </div>

                            {/* Quick Sound Alert Toggle (Web Audio API Chime) */}
                            <button
                                type="button"
                                id="gt-topbar-sound-btn"
                                class="gtb-icon-btn text-[#F2C230] cursor-pointer"
                                title="Alertas sonoros: Ativo (clique para testar/alternar)"
                                aria-label="Alternar alertas sonoros"
                            >
                                <svg id="gt-topbar-sound-icon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                            </button>

                            {/* Notification Bell with Interactive Dropdown Panel */}
                            <div class="relative">
                                <button
                                    type="button"
                                    id="gt-topbar-bell-link"
                                    onclick="document.getElementById('gt-notif-dropdown').classList.toggle('hidden');document.getElementById('gt-profile-menu').classList.add('hidden')"
                                    class="gtb-icon-btn relative cursor-pointer"
                                    title="Central de Notificações"
                                    aria-label="Abrir notificações"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                                    <span id="gt-topbar-bell-dot" class="hidden absolute top-2 right-2.5 w-2 h-2 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399]"></span>
                                </button>

                                <div
                                    id="gt-notif-dropdown"
                                    style="z-index: 120; width: min(24rem, calc(100vw - 2rem));"
                                    class="hidden gtb-dropdown gtb-notif-panel absolute right-0 mt-2.5 rounded-2xl shadow-2xl z-[120] overflow-hidden"
                                >
                                    <div class="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
                                        <div class="flex items-center gap-2">
                                            <span class="w-2 h-2 rounded-full bg-[#F2C230]"></span>
                                            <span class="gt-font-display text-xs font-extrabold text-white whitespace-nowrap">Central de Notificações</span>
                                        </div>
                                        <button type="button" id="gt-notif-clear-all" class="hidden text-[10.5px] font-bold text-[#8C95AA] hover:text-[#F2C230] transition cursor-pointer">
                                            Limpar tudo
                                        </button>
                                    </div>
                                    <div id="gt-notif-list" class="max-h-80 overflow-y-auto divide-y divide-white/5">
                                        <div class="gtb-notif-empty px-6 py-8 flex flex-col items-center text-center">
                                            <span class="gtb-notif-empty-icon">
                                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M5 13l4 4L19 7"/></svg>
                                            </span>
                                            <div class="mt-3 text-[13px] font-extrabold text-white">Carregando notificações...</div>
                                        </div>
                                    </div>
                                    <div class="px-4 py-2.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-2 text-[11px] font-bold">
                                        <a href="/admin/solicitacoes" class="text-[#F2C230] hover:underline no-underline whitespace-nowrap">Ver Solicitações →</a>
                                        <a href="/admin/atendimento" class="text-[#D5DCEB] hover:text-[#F2C230] hover:underline no-underline ml-auto whitespace-nowrap">Abrir Chat ao Vivo →</a>
                                    </div>
                                </div>
                            </div>

                            <span class="h-6 w-px bg-white/10 hidden sm:inline-block"></span>

                            {/* User Avatar & Profile Dropdown */}
                            <div class="relative">
                                <button
                                    type="button"
                                    onclick="document.getElementById('gt-profile-menu').classList.toggle('hidden');document.getElementById('gt-notif-dropdown').classList.add('hidden')"
                                    class="flex items-center gap-3 cursor-pointer text-right"
                                >
                                    <div class="hidden sm:block leading-tight">
                                        <div class="text-xs font-bold text-white">{currentUser.name}</div>
                                        <div class="text-[10.5px] text-[#8C95AA]">{currentUser.email}</div>
                                    </div>
                                    <div class="w-9 h-9 rounded-full bg-gradient-to-br from-[#F2C230] to-[#16749A] p-0.5 shadow-md shrink-0">
                                        <div class="gtb-avatar-inner w-full h-full rounded-full flex items-center justify-center text-xs font-extrabold">
                                            {initials}
                                        </div>
                                    </div>
                                </button>

                                <div id="gt-profile-menu" class="hidden gtb-dropdown absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl py-2 z-[120] text-xs font-semibold">
                                    <a href="/minha-conta" class="block px-4 py-2 no-underline">Minha Conta</a>
                                    <a href="/" target="_blank" class="block px-4 py-2 no-underline">Ver Site Público ↗</a>
                                    <a href="/portal" target="_blank" class="block px-4 py-2 no-underline">Portal do Cliente ↗</a>
                                    <form action="/auth/logout" method="post" class="border-t border-white/10 mt-1 pt-1">
                                        <button type="submit" class="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/10 font-bold cursor-pointer">Sair do Painel</button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Flash Toast Notifications (Auto-dismiss 5s) */}
                    {(successMessage || errorMessage) && (
                        <div id="gt-flash-toast-stack" class="gt-flash-toast-stack" role="status" aria-live="polite">
                            {successMessage && (
                                <div class="gt-flash-toast gt-flash-toast--success" data-auto-dismiss="5000">
                                    <span class="gt-flash-toast__icon" aria-hidden="true">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                                    </span>
                                    <div class="gt-flash-toast__content">
                                        <div class="gt-flash-toast__title">Operação concluída</div>
                                        <div class="gt-flash-toast__msg">{successMessage}</div>
                                    </div>
                                    <button type="button" class="gt-flash-toast__close" aria-label="Fechar notificação" onclick="var t=this.closest('.gt-flash-toast');if(t){t.classList.add('is-leaving');setTimeout(function(){t.remove();},250);}">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12"/></svg>
                                    </button>
                                    <span class="gt-flash-toast__bar"></span>
                                </div>
                            )}
                            {errorMessage && (
                                <div class="gt-flash-toast gt-flash-toast--error" data-auto-dismiss="6500">
                                    <span class="gt-flash-toast__icon" aria-hidden="true">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                                    </span>
                                    <div class="gt-flash-toast__content">
                                        <div class="gt-flash-toast__title">Atenção</div>
                                        <div class="gt-flash-toast__msg">{errorMessage}</div>
                                    </div>
                                    <button type="button" class="gt-flash-toast__close" aria-label="Fechar notificação" onclick="var t=this.closest('.gt-flash-toast');if(t){t.classList.add('is-leaving');setTimeout(function(){t.remove();},250);}">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12"/></svg>
                                    </button>
                                    <span class="gt-flash-toast__bar" style="animation-duration: 6.5s;"></span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Live Real-Time Toast Notification Stack (Sound + Visual Alert) */}
                    <div id="gt-live-toast-stack" class="fixed bottom-5 right-5 z-[100] w-80 max-w-[calc(100vw-2rem)] space-y-2.5 pointer-events-none"></div>

                    <main class="gt-admin-main flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-5">
                        {children}
                    </main>
                </div>

                {/* Sound Alert Engine (Web Audio API Chime) & Real-Time Notification Center */}
                <script dangerouslySetInnerHTML={{ __html: `
                (function () {
                    var audioCtx = null;
                    var STORAGE_KEY = 'gt_admin_dismissed_notifs_v1';

                    function ensureAudioUnlocked() {
                        try {
                            var Ctx = window.AudioContext || window.webkitAudioContext;
                            if (!Ctx) return null;
                            if (!audioCtx) audioCtx = new Ctx();
                            if (audioCtx.state === 'suspended') audioCtx.resume();
                            return audioCtx;
                        } catch (e) { return null; }
                    }

                    ['pointerdown', 'keydown'].forEach(function (evName) {
                        window.addEventListener(evName, function () { ensureAudioUnlocked(); }, { once: true, passive: true });
                    });

                    function isSoundEnabled() {
                        try { return localStorage.getItem('gt_admin_sound') !== 'off'; } catch (e) { return true; }
                    }

                    function setSoundEnabled(val) {
                        try { localStorage.setItem('gt_admin_sound', val ? 'on' : 'off'); } catch (e) {}
                        syncTopbarSoundBtn();
                    }

                    function syncTopbarSoundBtn() {
                        var btn = document.getElementById('gt-topbar-sound-btn');
                        if (!btn) return;
                        var on = isSoundEnabled();
                        btn.style.opacity = on ? '1' : '0.45';
                        btn.title = on ? 'Alertas sonoros: Ativo (clique para silenciar)' : 'Alertas sonoros: Mudo (clique para ativar e testar)';
                    }

                    function playChime() {
                        if (!isSoundEnabled()) return;
                        try {
                            var ctx = ensureAudioUnlocked();
                            if (!ctx) return;
                            var runTones = function () {
                                var now = ctx.currentTime;
                                [783.99, 1046.5, 1318.51].forEach(function (freq, idx) {
                                    var osc = ctx.createOscillator();
                                    var gain = ctx.createGain();
                                    osc.type = 'triangle';
                                    osc.frequency.setValueAtTime(freq, now + idx * 0.095);
                                    gain.gain.setValueAtTime(0.001, now + idx * 0.095);
                                    gain.gain.exponentialRampToValueAtTime(0.22, now + idx * 0.095 + 0.02);
                                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.095 + 0.28);
                                    osc.connect(gain);
                                    gain.connect(ctx.destination);
                                    osc.start(now + idx * 0.095);
                                    osc.stop(now + idx * 0.095 + 0.30);
                                });
                            };
                            if (ctx.state === 'suspended') {
                                ctx.resume().then(runTones).catch(function () {});
                            } else {
                                runTones();
                            }
                        } catch (e) {}
                    }

                    function showToast(title, body, href) {
                        var stack = document.getElementById('gt-live-toast-stack');
                        if (!stack) return;
                        var card = document.createElement('a');
                        card.href = href || '/admin/atendimento';
                        card.className = 'gtb-toast-card pointer-events-auto block rounded-2xl p-3.5 shadow-2xl no-underline transition';
                        card.innerHTML = '<div class="flex items-center justify-between gap-2"><span class="gtb-toast-title text-xs font-extrabold"></span><span class="w-2 h-2 rounded-full bg-[#34D399] shrink-0"></span></div><p class="gtb-toast-body text-[11px] mt-1 leading-snug"></p>';
                        card.querySelector('.gtb-toast-title').textContent = title;
                        card.querySelector('.gtb-toast-body').textContent = body;
                        stack.appendChild(card);
                        setTimeout(function () {
                            card.style.opacity = '0';
                            setTimeout(function () { card.remove(); }, 250);
                        }, 8000);
                    }

                    var topSoundBtn = document.getElementById('gt-topbar-sound-btn');
                    if (topSoundBtn) {
                        syncTopbarSoundBtn();
                        topSoundBtn.addEventListener('click', function () {
                            var next = !isSoundEnabled();
                            setSoundEnabled(next);
                            if (next) {
                                playChime();
                                showToast('Alertas sonoros ativados!', 'Você ouvirá um aviso sempre que chegar uma nova solicitação ou mensagem.', '/admin/atendimento');
                            }
                        });
                    }

                    function getDismissed() {
                        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch (e) { return {}; }
                    }
                    function saveDismissed(map) {
                        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch (e) {}
                    }

                    var clearAllBtn = document.getElementById('gt-notif-clear-all');
                    if (clearAllBtn) {
                        clearAllBtn.addEventListener('click', function (ev) {
                            ev.preventDefault();
                            var list = document.getElementById('gt-notif-list');
                            var map = getDismissed();
                            if (list) {
                                list.querySelectorAll('.gtb-notif-item').forEach(function (row) {
                                    map[row.dataset.notifKey || ''] = true;
                                });
                            }
                            saveDismissed(map);
                            renderNotifications([]);
                        });
                    }

                    function renderNotifications(items) {
                        var list = document.getElementById('gt-notif-list');
                        var bellDot = document.getElementById('gt-topbar-bell-dot');
                        if (!list) return;
                        var dismissed = getDismissed();
                        var visible = (items || []).filter(function (it) { return !dismissed[it.key]; });
                        if (bellDot) bellDot.classList.toggle('hidden', visible.length === 0);
                        if (clearAllBtn) clearAllBtn.classList.toggle('hidden', visible.length === 0);

                        list.innerHTML = '';
                        if (visible.length === 0) {
                            list.innerHTML = '<div class="gtb-notif-empty px-6 py-8 flex flex-col items-center text-center"><span class="gtb-notif-empty-icon"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M5 13l4 4L19 7"/></svg></span><div class="mt-3 text-[13px] font-extrabold text-white">Tudo em dia por aqui!</div><p class="mt-1 text-[11.5px] leading-relaxed text-[#8C95AA] max-w-[16rem]">Nenhuma solicitação ou conversa pendente no momento.</p></div>';
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
                            list.appendChild(row);
                        });
                    }

                    function readSeen(k) {
                        try { var v = sessionStorage.getItem(k); return v !== null ? parseInt(v, 10) : null; } catch (e) { return null; }
                    }
                    function writeSeen(k, v) {
                        try { sessionStorage.setItem(k, String(v)); } catch (e) {}
                    }

                    window.GT_AdminNotify = {
                        isSoundEnabled: isSoundEnabled,
                        setSoundEnabled: setSoundEnabled,
                        playChime: playChime,
                        showToast: showToast
                    };

                    async function checkGlobalUpdates() {
                        try {
                            var resp = await fetch('/admin/atendimento/resumo', { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' });
                            if (!resp.ok) return;
                            var data = await resp.json();
                            if (!data || !data.ok) return;

                            var reqBadge = document.getElementById('gt-sidebar-requests-badge');
                            if (reqBadge && typeof data.pending_requests === 'number') {
                                reqBadge.textContent = String(data.pending_requests);
                                reqBadge.classList.toggle('hidden', data.pending_requests <= 0);
                            }
                            var chatBadge = document.getElementById('gt-sidebar-chats-badge');
                            if (chatBadge && typeof data.open_chats === 'number') {
                                chatBadge.textContent = String(data.open_chats);
                                chatBadge.classList.toggle('hidden', data.open_chats <= 0);
                            }
                            renderNotifications(data.notifications || []);

                            var prevConv = readSeen('gt_seen_conv_id');
                            var prevMsg = readSeen('gt_seen_msg_id');
                            var prevReq = readSeen('gt_seen_req_id');

                            if (prevConv === null || prevMsg === null || prevReq === null) {
                                writeSeen('gt_seen_conv_id', data.latest_conversation_id || 0);
                                writeSeen('gt_seen_msg_id', data.latest_client_message_id || 0);
                                writeSeen('gt_seen_req_id', data.latest_request_id || 0);
                                return;
                            }

                            if ((data.latest_conversation_id || 0) > prevConv) {
                                writeSeen('gt_seen_conv_id', data.latest_conversation_id);
                                writeSeen('gt_seen_msg_id', Math.max(prevMsg, data.latest_client_message_id || 0));
                                writeSeen('gt_seen_req_id', Math.max(prevReq, data.latest_request_id || 0));
                                playChime();
                                showToast('Novo atendimento no chat!', 'Um visitante iniciou conversa no site (CRM Autônomo ativo). Clique para acompanhar.', '/admin/atendimento');
                            } else if ((data.latest_request_id || 0) > prevReq) {
                                writeSeen('gt_seen_req_id', data.latest_request_id);
                                playChime();
                                showToast('Nova solicitação recebida!', 'Um novo lead chegou pelo site. Clique para abrir a fila.', '/admin/solicitacoes');
                            } else if ((data.latest_client_message_id || 0) > prevMsg) {
                                writeSeen('gt_seen_msg_id', data.latest_client_message_id);
                                playChime();
                                showToast('Nova mensagem de visitante', 'Há novas mensagens no chat ao vivo. Clique para abrir.', '/admin/atendimento');
                            }
                        } catch (e) {
                        } finally {
                            setTimeout(checkGlobalUpdates, 6000);
                        }
                    }

                    // Auto-dismiss dos toasts de feedback (?success= / ?error=) + limpeza da URL
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

                    // Modal corporativo de confirmação (substitui todos os window.confirm nativos do navegador)
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

                        // Converte automaticamente onsubmit="return confirm('...')" e onclick="return confirm('...')"
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
                                btnOk.innerHTML = 'Confirmar Exclusão';
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

                    // Feedback visual imediato (spinner + "Processando...") em qualquer submit do painel
                    document.addEventListener('submit', function (ev) {
                        if (ev.defaultPrevented) return;
                        var form = ev.target;
                        if (!form || form.tagName !== 'FORM') return;
                        var btn = ev.submitter || form.querySelector('button[type="submit"], button:not([type])');
                        if (!btn || btn.classList.contains('gt-btn-loading')) return;
                        var label = btn.getAttribute('data-loading-text') || 'Processando...';
                        btn.classList.add('gt-btn-loading');
                        btn.setAttribute('aria-busy', 'true');
                        btn.innerHTML = '<span class="gt-btn-spinner" aria-hidden="true"></span><span>' + label + '</span>';
                    }, false);

                    checkGlobalUpdates();
                })();
                ` }} />

                {/* Modal Global Corporativo de Confirmação */}
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
                                <h3 id="gt-confirm-title" class="gt-confirm-title">Confirmar Exclusão</h3>
                                <p id="gt-confirm-message" class="gt-confirm-message">Deseja realmente continuar com esta ação?</p>
                                <p id="gt-confirm-subnote" class="gt-confirm-subnote">Esta ação é permanente e não poderá ser desfeita.</p>
                            </div>
                        </div>
                        <div class="gt-confirm-actions">
                            <button type="button" id="gt-confirm-cancel" class="gt-btn-outline gt-btn-sm">
                                Cancelar
                            </button>
                            <button type="button" id="gt-confirm-ok" class="gt-btn-danger-solid">
                                Sim, Excluir
                            </button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
};
