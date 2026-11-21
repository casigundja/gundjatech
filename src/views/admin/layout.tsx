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
                <link rel="icon" type="image/svg+xml" href="/img/favicon.svg?v=gt-icon2" />
                <link rel="apple-touch-icon" sizes="180x180" href="/img/apple-touch-icon.png?v=gt-icon2" />
                <link rel="preload" href="/fonts/ZalandoSansExpanded-Regular.woff2" as="font" type="font/woff2" crossOrigin="" />
                <link rel="preload" href="/fonts/ZalandoSansExpanded-Bold.woff2" as="font" type="font/woff2" crossOrigin="" />
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
                <link rel="stylesheet" href="/build/assets/app-DaNuWIIs.css" />
                <link rel="stylesheet" href="/css/gt-admin.css?v=18" />
                <script src="/build/assets/app-6maz6CTJ.js" defer></script>
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
                        border: 1px solid var(--gt-border);
                        cursor: pointer;
                        font-size: 13px;
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

                {/* Left Sidebar (Identical to resources/views/layouts/admin.blade.php) */}
                <aside
                    id="gt-admin-sidebar"
                    class="gtb-sidebar fixed inset-y-0 left-0 z-50 lg:static lg:inset-0 shrink-0 -translate-x-full lg:translate-x-0 transition-transform duration-200"
                >
                    <div class="flex flex-col min-h-0 flex-1">
                        {/* Brand Header */}
                        <div class="h-[72px] flex items-center justify-between px-4 shrink-0">
                            <a href="/admin/dashboard" class="flex items-center gap-2.5 no-underline">
                                <span class="gtb-brand-badge">
                                    <img src="/img/favicon.svg?v=gt-icon2" alt="GundjaTech" class="w-5 h-5 object-contain" />
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
                                    <span>Tráfego & Analytics</span>
                                </div>
                            </a>

                            <a href="/admin/financeiro" class={`gtb-nav-item ${activeNav === 'finance' ? 'is-active' : ''}`} title="Receita & Caixa">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                                    <span>Receita & Caixa</span>
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
                                    <span>Serviços & Soluções</span>
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
                            </a>

                            <div class="gtb-section-head pt-4 border-t border-white/5 mt-2">
                                <span>Workspaces</span>
                            </div>

                            <a href="/admin/dominios" class={`gtb-nav-item ${activeNav === 'domains' ? 'is-active' : ''}`} title="Domínios & DNS">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
                                    <span>Domínios & DNS</span>
                                </div>
                            </a>

                            <a href="/admin/usuarios" class={`gtb-nav-item ${activeNav === 'users' ? 'is-active' : ''}`} title="Equipe & Usuários">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                                    <span>Equipe & Usuários</span>
                                </div>
                            </a>

                            <div class="pt-3 mt-2 border-t border-white/5 space-y-1">
                                <a href="/admin/atendimento" class={`gtb-nav-item ${activeNav === 'chat' ? 'is-active' : ''}`} title="Suporte & Chat">
                                    <div class="flex items-center gap-3">
                                        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                        <span>Suporte & Chat</span>
                                    </div>
                                    <span class="gtb-badge-pill">AUTO</span>
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

                            {/* Notification Bell */}
                            <a href="/admin/solicitacoes" class="gtb-icon-btn relative cursor-pointer" title="Solicitações e Notificações">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                            </a>

                            <span class="h-6 w-px bg-white/10 hidden sm:inline-block"></span>

                            {/* User Avatar & Profile Dropdown */}
                            <div class="relative">
                                <button
                                    type="button"
                                    onclick="document.getElementById('gt-profile-menu').classList.toggle('hidden')"
                                    class="flex items-center gap-3 cursor-pointer text-right"
                                >
                                    <div class="hidden sm:block leading-tight">
                                        <div class="text-xs font-bold text-white">{currentUser.name} ({currentUser.role})</div>
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

                    <main class="flex-1 overflow-y-auto p-4 sm:p-7 space-y-6">
                        {successMessage && <div class="gt-alert-success">✓ {successMessage}</div>}
                        {errorMessage && <div class="gt-alert-error">✕ {errorMessage}</div>}
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
};
