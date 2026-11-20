<!DOCTYPE html>
<html lang="pt-BR" class="h-full dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Painel Administrativo • GundjaTech')</title>
    <link rel="icon" type="image/svg+xml" href="/img/favicon.svg">
    <link rel="preload" href="/fonts/ZalandoSansExpanded-Regular.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/fonts/ZalandoSansExpanded-Bold.woff2" as="font" type="font/woff2" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <link rel="stylesheet" href="/css/gt-admin.css?v=10">
    <script>
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
    </script>
    @livewireStyles
</head>
<body
    class="gt-admin-boost font-sans antialiased h-full flex overflow-hidden"
    x-data="{
        sidebarOpen: false,
        sidebarCollapsed: false,
        profileOpen: false,
        theme: (function () { try { return localStorage.getItem('gt_admin_theme') || 'dark'; } catch (e) { return 'dark'; } })(),
        setTheme(val) {
            this.theme = window.GT_SetAdminTheme ? window.GT_SetAdminTheme(val) : (val === 'light' ? 'light' : 'dark');
        },
        toggleTheme() {
            this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
        }
    }"
    :class="theme === 'light' ? 'is-light-mode' : 'is-dark-mode'"
>
    <script>
        (function () {
            var t = document.documentElement.getAttribute('data-admin-theme') || 'dark';
            document.body.classList.toggle('is-light-mode', t === 'light');
            document.body.classList.toggle('is-dark-mode', t !== 'light');
        })();
    </script>
    @php
        $currentUser = Auth::user();
        $totalNotifications = ($adminPendingRequestsCount ?? 0) + ($adminOpenChatsCount ?? 0);
    @endphp

    <!-- Mobile Backdrop -->
    <div x-show="sidebarOpen" x-cloak @click="sidebarOpen = false" class="fixed inset-0 z-40 bg-black/75 backdrop-blur-xs lg:hidden"></div>

    <!-- Collapsible Left Sidebar (Expanded 252px <-> Collapsed 76px Icon Rail, matching print) -->
    <aside
        :class="[
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
            sidebarCollapsed ? 'is-collapsed' : ''
        ]"
        class="gtb-sidebar fixed inset-y-0 left-0 z-50 lg:static lg:inset-0 shrink-0"
    >
        <div class="flex flex-col min-h-0 flex-1">
            <!-- Brand Header -->
            <div class="h-[72px] flex items-center justify-between px-4 shrink-0" :class="sidebarCollapsed ? 'justify-center' : ''">
                <a href="{{ route('admin.dashboard') }}" class="flex items-center gap-2.5 no-underline">
                    <span class="gtb-brand-badge">
                        <img src="/img/favicon.svg" alt="GundjaTech" class="w-5 h-5 object-contain">
                    </span>
                    <span x-show="!sidebarCollapsed" class="gt-font-display gtb-brand-word text-sm font-bold tracking-tight text-white">
                        Gundja<span class="gtb-brand-tech text-[#F2C230] font-normal">Tech</span>
                    </span>
                </a>
                <button @click="sidebarOpen = false" class="text-gray-400 hover:text-white lg:hidden p-1">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>

            <!-- Section 1: MAIN MENU + Collapse Toggle (<< / >>) -->
            <div class="gtb-section-head">
                <span x-show="!sidebarCollapsed">Menu Principal</span>
                <span x-show="sidebarCollapsed" x-cloak class="mx-auto">M</span>
                <button
                    type="button"
                    @click="sidebarCollapsed = !sidebarCollapsed"
                    class="hidden lg:inline-flex text-[#8C95AA] hover:text-[#F2C230] transition cursor-pointer p-0.5"
                    :title="sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'"
                >
                    <span x-text="sidebarCollapsed ? '»' : '«'" class="text-xs font-extrabold leading-none">«</span>
                </button>
            </div>

            <!-- Navigation Links -->
            <nav class="px-3 space-y-1 overflow-y-auto flex-1">
                @if($currentUser->hasPermission('admin.dashboard.view'))
                    <a href="{{ route('admin.dashboard') }}" class="gtb-nav-item {{ request()->routeIs('admin.dashboard') ? 'is-active' : '' }}" title="Dashboard">
                        <div class="flex items-center gap-3">
                            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
                            <span x-show="!sidebarCollapsed">Dashboard</span>
                        </div>
                    </a>
                @endif

                @if($currentUser->hasPermission('campaigns.view'))
                    <a href="{{ route('admin.campaigns.index') }}" class="gtb-nav-item {{ request()->routeIs('admin.campaigns*') ? 'is-active' : '' }}" title="Tráfego & Analytics">
                        <div class="flex items-center gap-3">
                            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                            <span x-show="!sidebarCollapsed">Tráfego & Analytics</span>
                        </div>
                    </a>
                @endif

                @if($currentUser->hasPermission('finance.view'))
                    <a href="{{ route('admin.finance.index') }}" class="gtb-nav-item {{ request()->routeIs('admin.finance*') ? 'is-active' : '' }}" title="Financeiro & Receita">
                        <div class="flex items-center gap-3">
                            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                            <span x-show="!sidebarCollapsed">Receita & Caixa</span>
                        </div>
                    </a>
                @endif

                @if($currentUser->hasPermission('projects.view'))
                    <a href="{{ route('admin.projects.index') }}" class="gtb-nav-item {{ request()->routeIs('admin.projects*') ? 'is-active' : '' }}" title="Projetos">
                        <div class="flex items-center gap-3">
                            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                            <span x-show="!sidebarCollapsed">Projetos</span>
                        </div>
                        <span x-show="!sidebarCollapsed" class="gtb-badge-pill">PRO</span>
                    </a>
                @endif

                @if($currentUser->hasPermission('services.view'))
                    <a href="{{ route('admin.services.index') }}" class="gtb-nav-item {{ request()->routeIs('admin.services*') ? 'is-active' : '' }}" title="Serviços & Catálogo">
                        <div class="flex items-center gap-3">
                            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"/></svg>
                            <span x-show="!sidebarCollapsed">Serviços & Soluções</span>
                        </div>
                    </a>
                @endif

                @if($currentUser->hasPermission('clients.view'))
                    <a href="{{ route('admin.clients.index') }}" class="gtb-nav-item {{ request()->routeIs('admin.clients*') ? 'is-active' : '' }}" title="Clientes">
                        <div class="flex items-center gap-3">
                            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            <span x-show="!sidebarCollapsed">Clientes</span>
                        </div>
                    </a>
                @endif

                @if($currentUser->hasPermission('requests.view'))
                    <a href="{{ route('admin.requests.index') }}" class="gtb-nav-item {{ request()->routeIs('admin.requests*') ? 'is-active' : '' }}" title="Solicitações">
                        <div class="flex items-center gap-3">
                            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                            <span x-show="!sidebarCollapsed">Solicitações</span>
                        </div>
                        @if(($adminPendingRequestsCount ?? 0) > 0)
                            <span x-show="!sidebarCollapsed" id="gt-sidebar-requests-badge" class="gtb-count-circle">{{ $adminPendingRequestsCount }}</span>
                        @else
                            <span x-show="!sidebarCollapsed" id="gt-sidebar-requests-badge" class="gtb-count-circle hidden">0</span>
                        @endif
                    </a>
                @endif

                <!-- Section 2: WORKSPACES / ECOSSISTEMA -->
                <div class="gtb-section-head pt-4 border-t border-white/5 mt-2">
                    <span x-show="!sidebarCollapsed">Workspaces</span>
                    <span x-show="sidebarCollapsed" x-cloak class="mx-auto">W</span>
                    @if($currentUser->hasPermission('quotations.manage'))
                        <a x-show="!sidebarCollapsed" href="{{ route('admin.quotations.create') }}" class="text-[#8C95AA] hover:text-[#F2C230] no-underline text-xs font-bold" title="Novo Orçamento">+</a>
                    @endif
                </div>

                @if($currentUser->hasPermission('quotations.view'))
                    <a href="{{ route('admin.quotations.index') }}" class="gtb-nav-item {{ request()->routeIs('admin.quotations*') ? 'is-active' : '' }}" title="Orçamentos">
                        <div class="flex items-center gap-3">
                            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                            <span x-show="!sidebarCollapsed">Orçamentos</span>
                        </div>
                    </a>
                @endif

                @if($currentUser->hasPermission('domains.view'))
                    <a href="{{ route('admin.domains.index') }}" class="gtb-nav-item {{ request()->routeIs('admin.domains*') ? 'is-active' : '' }}" title="Domínios & DNS">
                        <div class="flex items-center gap-3">
                            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
                            <span x-show="!sidebarCollapsed">Domínios & DNS</span>
                        </div>
                    </a>
                @endif

                @if($currentUser->hasPermission('users.view'))
                    <a href="{{ route('admin.users.index') }}" class="gtb-nav-item {{ request()->routeIs('admin.users*') ? 'is-active' : '' }}" title="Usuários & Equipe">
                        <div class="flex items-center gap-3">
                            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                            <span x-show="!sidebarCollapsed">Equipe & Usuários</span>
                        </div>
                    </a>
                @endif

                <div class="pt-3 mt-2 border-t border-white/5 space-y-1">
                    @if($currentUser->hasPermission('chat.view'))
                        <a href="{{ route('admin.crm.index') }}" class="gtb-nav-item {{ request()->routeIs('admin.crm*') ? 'is-active' : '' }}" title="CRM Autônomo IA">
                            <div class="flex items-center gap-3">
                                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                                <span x-show="!sidebarCollapsed">CRM Autônomo IA</span>
                            </div>
                            <span x-show="!sidebarCollapsed" class="gtb-badge-pill">AUTO</span>
                        </a>

                        <a href="{{ route('admin.chat.index') }}" class="gtb-nav-item {{ request()->routeIs('admin.chat*') ? 'is-active' : '' }}" title="Atendimento & Suporte">
                            <div class="flex items-center gap-3">
                                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                <span x-show="!sidebarCollapsed">Suporte & Chat</span>
                            </div>
                            @if(($adminOpenChatsCount ?? 0) > 0)
                                <span x-show="!sidebarCollapsed" id="gt-sidebar-chats-badge" class="gtb-count-circle">{{ $adminOpenChatsCount }}</span>
                            @else
                                <span x-show="!sidebarCollapsed" id="gt-sidebar-chats-badge" class="gtb-count-circle hidden">0</span>
                            @endif
                        </a>
                    @endif

                    @if($currentUser->hasPermission('settings.manage'))
                        <a href="{{ route('admin.permissions.index') }}" class="gtb-nav-item {{ request()->routeIs('admin.permissions*') ? 'is-active' : '' }}" title="Configurações & RBAC">
                            <div class="flex items-center gap-3">
                                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
                                <span x-show="!sidebarCollapsed">Configurações</span>
                            </div>
                        </a>
                    @endif
                </div>
            </nav>
        </div>

        <!-- Bottom Action Card -->
        @php
            $sidebarCtaUrl = $currentUser->hasPermission('quotations.manage')
                ? route('admin.quotations.create')
                : ($currentUser->hasPermission('requests.view') ? route('admin.requests.index') : route('admin.dashboard'));
            $sidebarCtaLabel = $currentUser->hasPermission('quotations.manage') ? 'Novo Orçamento' : 'Ver Solicitações';
        @endphp
        <div x-show="!sidebarCollapsed" class="gtb-promo-card">
            <div class="text-[10.5px] font-bold tracking-wider uppercase text-white/90 leading-snug">
                GESTÃO OPERACIONAL<br>
                <strong class="text-[#F2C230]">GUNDJATECH PRO ✦</strong>
            </div>
            <a href="{{ $sidebarCtaUrl }}" class="gtb-promo-btn">
                <span>{{ $sidebarCtaLabel }}</span>
                <span class="text-[#E4A318]">♛</span>
            </a>
        </div>
        <div x-show="sidebarCollapsed" x-cloak class="p-3 flex justify-center">
            <a href="{{ $sidebarCtaUrl }}" class="w-10 h-10 rounded-xl text-[#0B0E1A] flex items-center justify-center font-extrabold no-underline shadow-lg" style="background: linear-gradient(135deg, #F2C230 0%, #121AFF 100%);" title="{{ $sidebarCtaLabel }}">
                ♛
            </a>
        </div>
    </aside>

    <!-- Main Workspace Area -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <!-- Top Header Bar (Title on left; Search + KBD + Theme Pill + Bell + User Profile on right) -->
        <header class="gtb-topbar">
            <div class="flex items-center gap-3 min-w-0">
                <button @click="sidebarOpen = !sidebarOpen" class="gtb-mobile-toggle gtb-icon-btn rounded-xl" aria-label="Abrir menu">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
                <h1 class="gt-font-display gtb-topbar-title text-lg sm:text-xl font-bold tracking-tight truncate">
                    @yield('header_title', 'Dashboard')
                </h1>
            </div>

            <div class="flex items-center gap-3 shrink-0">
                <!-- Search Box with ⌘ F Pill -->
                <form action="{{ route('admin.requests.index') }}" method="GET" class="gtb-search-box hidden md:flex">
                    <svg class="w-4 h-4 text-[#8C95AA] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <input type="text" name="search" value="{{ request('search') }}" placeholder="Pesquisar demandas, clientes..." aria-label="Pesquisar">
                    <span class="gtb-kbd-pill">⌘ F</span>
                </form>

                <!-- Theme / Mode Toggle Pill (Interactive Light & Dark Switch) -->
                <div class="gtb-theme-switch" role="group" aria-label="Alternar entre modo claro e modo escuro">
                    <button
                        type="button"
                        data-theme-orb="light"
                        onclick="window.GT_SetAdminTheme && window.GT_SetAdminTheme('light')"
                        @click="setTheme('light')"
                        :class="theme === 'light' ? 'is-active' : ''"
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
                        @click="setTheme('dark')"
                        :class="theme === 'dark' ? 'is-active' : ''"
                        class="gtb-theme-orb cursor-pointer border-0"
                        title="Modo Escuro"
                        aria-label="Ativar modo escuro"
                    >
                        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
                    </button>
                </div>

                <!-- Quick Sound Alert Toggle (unlocks browser audio & tests chime) -->
                @if($currentUser->hasPermission('chat.view'))
                    <button type="button" id="gt-topbar-sound-btn" class="gtb-icon-btn text-[#F2C230] cursor-pointer" title="Alertas sonoros: Ativo (clique para testar/alternar)">
                        <svg id="gt-topbar-sound-icon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                    </button>
                @endif

                <!-- Notification Bell with Live Indicator -->
                <a href="{{ route('admin.requests.index') }}" id="gt-topbar-bell-link" class="gtb-icon-btn relative" title="Notificações ({{ $totalNotifications }})">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                    <span id="gt-topbar-bell-dot" class="{{ $totalNotifications > 0 ? '' : 'hidden' }} absolute top-2 right-2.5 w-2 h-2 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399]"></span>
                </a>

                <span class="h-6 w-px bg-white/10 hidden sm:inline-block"></span>

                <!-- User Name, Email & Avatar Dropdown -->
                <div class="relative" @click.away="profileOpen = false">
                    <button type="button" @click="profileOpen = !profileOpen" class="flex items-center gap-3 cursor-pointer text-right">
                        <div class="hidden sm:block leading-tight">
                            <div class="text-xs font-bold text-white">{{ $currentUser->name }}</div>
                            <div class="text-[10.5px] text-[#8C95AA]">{{ $currentUser->email }}</div>
                        </div>
                        <div class="w-9 h-9 rounded-full bg-gradient-to-br from-[#F2C230] to-[#16749A] p-0.5 shadow-md shrink-0">
                            <div class="gtb-avatar-inner w-full h-full rounded-full flex items-center justify-center text-xs font-extrabold">
                                {{ strtoupper(substr($currentUser->name, 0, 2)) }}
                            </div>
                        </div>
                    </button>

                    <div x-show="profileOpen" x-cloak class="gtb-dropdown absolute right-0 mt-2 w-52 rounded-2xl shadow-2xl py-2 z-50 text-xs font-semibold">
                        <a href="{{ route('home') }}" target="_blank" class="block px-4 py-2 no-underline">Ver Site Público &nearr;</a>
                        @if($currentUser->isAdmin() || $currentUser->hasPermission('portal.access'))
                            <a href="{{ route('portal.dashboard') }}" target="_blank" class="block px-4 py-2 no-underline">Portal do Cliente &nearr;</a>
                        @endif
                        <form action="{{ route('logout') }}" method="POST" class="border-t border-white/10 mt-1 pt-1">
                            @csrf
                            <button type="submit" class="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/10 font-bold cursor-pointer">Sair do Painel</button>
                        </form>
                    </div>
                </div>
            </div>
        </header>

        <!-- Flash Alerts -->
        @if(session('success'))
            <div class="px-6 pt-3">
                <div class="gtb-alert-success p-3.5 text-xs font-semibold rounded-2xl flex items-center gap-2.5">
                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                    <span>{{ session('success') }}</span>
                </div>
            </div>
        @endif
        @if(session('error'))
            <div class="px-6 pt-3">
                <div class="gtb-alert-error p-3.5 text-xs font-semibold rounded-2xl flex items-center gap-2.5">
                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    <span>{{ session('error') }}</span>
                </div>
            </div>
        @endif
        @if($errors->any())
            <div class="px-6 pt-3">
                <div class="gtb-alert-error p-3.5 text-xs rounded-2xl space-y-1">
                    <div class="font-bold">Verifique os campos informados:</div>
                    <ul class="list-disc list-inside space-y-0.5">
                        @foreach($errors->all() as $error)
                            <li>{{ $error }}</li>
                        @endforeach
                    </ul>
                </div>
            </div>
        @endif

        <!-- Main Scrollable Content -->
        <main class="flex-1 overflow-y-auto px-4 sm:px-6 pb-8 pt-4 space-y-5">
            @yield('content')
        </main>
    </div>

    <!-- Live Notification Toast Stack -->
    <div id="gt-live-toast-stack" class="fixed bottom-5 right-5 z-[90] flex flex-col gap-2.5 max-w-sm pointer-events-none" aria-live="polite"></div>

    <!-- Global Executive Confirmation Modal (replaces native browser confirm()) -->
    <div id="gt-confirm-modal" class="gtb-confirm-backdrop fixed inset-0 z-[100] hidden items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="gt-confirm-title">
        <div id="gt-confirm-card" class="gtb-confirm-card w-full max-w-md">
            <div class="gtb-confirm-bar"></div>
            <div class="p-6 space-y-4">
                <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-3">
                        <span class="gtb-confirm-icon">
                            <svg id="gt-confirm-svg-danger" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            <svg id="gt-confirm-svg-warning" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                        </span>
                        <div>
                            <div class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8C95AA]">
                                <img src="/img/favicon.svg" alt="" class="w-3.5 h-3.5 object-contain">
                                <span>GundjaTech • Confirmação</span>
                            </div>
                            <h3 id="gt-confirm-title" class="gt-font-display gtb-confirm-title text-base font-bold mt-0.5">Confirmar ação</h3>
                        </div>
                    </div>
                    <button type="button" id="gt-confirm-close" class="p-1.5 rounded-lg text-[#8C95AA] hover:text-[#F2C230] transition cursor-pointer" aria-label="Fechar">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>

                <p id="gt-confirm-message" class="gtb-confirm-message text-xs sm:text-sm leading-relaxed"></p>

                <div id="gt-confirm-target-wrap" class="gtb-confirm-target hidden px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-[#F2C230] shrink-0"></span>
                    <span id="gt-confirm-target" class="truncate"></span>
                </div>
            </div>

            <div class="gtb-confirm-footer px-6 py-4 flex items-center justify-end gap-2.5">
                <button type="button" id="gt-confirm-cancel" class="btn-secondary px-4 py-2 text-xs cursor-pointer">
                    Cancelar
                </button>
                <button type="button" id="gt-confirm-ok" class="gtb-btn-danger px-4 py-2 text-xs cursor-pointer">
                    Confirmar
                </button>
            </div>
        </div>
    </div>

    <script>
        (function () {
            const modal = document.getElementById('gt-confirm-modal');
            const card = document.getElementById('gt-confirm-card');
            const titleEl = document.getElementById('gt-confirm-title');
            const msgEl = document.getElementById('gt-confirm-message');
            const targetWrap = document.getElementById('gt-confirm-target-wrap');
            const targetEl = document.getElementById('gt-confirm-target');
            const okBtn = document.getElementById('gt-confirm-ok');
            const cancelBtn = document.getElementById('gt-confirm-cancel');
            const closeBtn = document.getElementById('gt-confirm-close');
            const svgDanger = document.getElementById('gt-confirm-svg-danger');
            const svgWarning = document.getElementById('gt-confirm-svg-warning');

            if (!modal || !card || !okBtn) return;

            let pendingForm = null;

            function closeModal() {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                okBtn.disabled = false;
                pendingForm = null;
            }

            function openModal(form) {
                pendingForm = form;
                const tone = form.dataset.confirmTone || 'danger';
                const isWarning = tone === 'warning';

                card.classList.toggle('is-warning', isWarning);
                svgDanger.classList.toggle('hidden', isWarning);
                svgWarning.classList.toggle('hidden', !isWarning);

                titleEl.textContent = form.dataset.confirmTitle || 'Confirmar exclusão';
                msgEl.textContent = form.dataset.confirmMessage || 'Tem certeza que deseja continuar com esta ação?';

                const targetText = (form.dataset.confirmTarget || '').trim();
                if (targetText) {
                    targetEl.textContent = targetText;
                    targetWrap.classList.remove('hidden');
                } else {
                    targetWrap.classList.add('hidden');
                }

                okBtn.className = (isWarning ? 'btn-primary' : 'gtb-btn-danger') + ' px-4 py-2 text-xs cursor-pointer';
                okBtn.textContent = form.dataset.confirmButton || (isWarning ? 'Confirmar' : 'Sim, excluir');
                okBtn.disabled = false;

                modal.classList.remove('hidden');
                modal.classList.add('flex');
                cancelBtn.focus();
            }

            document.addEventListener('submit', function (ev) {
                const form = ev.target;
                if (!(form instanceof HTMLFormElement)) return;
                if (!form.dataset.confirmMessage) return;
                if (form.dataset.confirmed === '1') return;

                ev.preventDefault();
                openModal(form);
            }, true);

            okBtn.addEventListener('click', function () {
                if (!pendingForm) return;
                const formToSubmit = pendingForm;
                okBtn.disabled = true;
                okBtn.textContent = 'Processando...';
                formToSubmit.dataset.confirmed = '1';
                formToSubmit.submit();
            });

            cancelBtn.addEventListener('click', closeModal);
            closeBtn.addEventListener('click', closeModal);
            modal.addEventListener('click', function (ev) {
                if (ev.target === modal) closeModal();
            });
            document.addEventListener('keydown', function (ev) {
                if (ev.key === 'Escape' && !modal.classList.contains('hidden')) {
                    closeModal();
                }
            });
        })();
    </script>

    @livewireScripts
    @if($currentUser->hasPermission('chat.view'))
        <script>
        (function () {
            let audioCtx = null;

            function ensureAudioUnlocked() {
                try {
                    const Ctx = window.AudioContext || window.webkitAudioContext;
                    if (!Ctx) return null;
                    if (!audioCtx) audioCtx = new Ctx();
                    if (audioCtx.state === 'suspended') audioCtx.resume();
                    return audioCtx;
                } catch (e) {
                    return null;
                }
            }

            // Unlock browser AudioContext automatically on the first click or keypress in /admin
            ['pointerdown', 'keydown'].forEach(function (evName) {
                window.addEventListener(evName, function () {
                    ensureAudioUnlocked();
                }, { once: true, passive: true });
            });

            function isSoundEnabled() {
                try { return localStorage.getItem('gt_admin_sound') !== 'off'; } catch (e) { return true; }
            }

            function setSoundEnabled(val) {
                try { localStorage.setItem('gt_admin_sound', val ? 'on' : 'off'); } catch (e) {}
                syncTopbarSoundBtn();
            }

            function syncTopbarSoundBtn() {
                const btn = document.getElementById('gt-topbar-sound-btn');
                if (!btn) return;
                const on = isSoundEnabled();
                btn.style.opacity = on ? '1' : '0.45';
                btn.title = on ? 'Alertas sonoros: Ativo (clique para silenciar)' : 'Alertas sonoros: Mudo (clique para ativar e testar)';
            }

            const topSoundBtn = document.getElementById('gt-topbar-sound-btn');
            if (topSoundBtn) {
                syncTopbarSoundBtn();
                topSoundBtn.addEventListener('click', function () {
                    const next = !isSoundEnabled();
                    setSoundEnabled(next);
                    if (next) {
                        playChime();
                        showToast('Alertas sonoros ativados!', 'Você ouvirá um aviso sempre que chegar uma nova solicitação ou mensagem.', @json(route('admin.chat.index')));
                    }
                });
            }

            function playChime() {
                if (!isSoundEnabled()) return;
                try {
                    const ctx = ensureAudioUnlocked();
                    if (!ctx) return;

                    const runTones = function () {
                        const now = ctx.currentTime;
                        [783.99, 1046.5, 1318.51].forEach(function (freq, idx) {
                            const osc = ctx.createOscillator();
                            const gain = ctx.createGain();
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

            function readSeen(key) {
                try {
                    const v = sessionStorage.getItem(key);
                    return v !== null ? parseInt(v, 10) : null;
                } catch (e) { return null; }
            }

            function writeSeen(key, val) {
                try { sessionStorage.setItem(key, String(val)); } catch (e) {}
            }

            function showToast(title, body, href) {
                const stack = document.getElementById('gt-live-toast-stack');
                if (!stack) return;

                const card = document.createElement('a');
                card.href = href || @json(route('admin.chat.index'));
                card.className = 'gtb-toast-card pointer-events-auto block rounded-2xl p-3.5 shadow-2xl no-underline transition';

                const top = document.createElement('div');
                top.className = 'flex items-center justify-between gap-2';
                const heading = document.createElement('span');
                heading.className = 'gtb-toast-title text-xs font-extrabold';
                heading.textContent = title;
                const badge = document.createElement('span');
                badge.className = 'w-2 h-2 rounded-full bg-[#34D399] shrink-0';
                top.appendChild(heading);
                top.appendChild(badge);

                const desc = document.createElement('p');
                desc.className = 'gtb-toast-body text-[11px] mt-1 leading-snug';
                desc.textContent = body;

                card.appendChild(top);
                card.appendChild(desc);
                stack.appendChild(card);

                setTimeout(function () {
                    card.style.opacity = '0';
                    setTimeout(function () { card.remove(); }, 250);
                }, 8000);
            }

            function notifyDesktop(title, body, href) {
                if (!('Notification' in window) || Notification.permission !== 'granted') return;
                try {
                    const n = new Notification(title, { body: body, icon: '/img/favicon.svg' });
                    n.onclick = function () {
                        window.focus();
                        if (href) window.location.href = href;
                        n.close();
                    };
                } catch (e) {}
            }

            function updateGlobalCounters(data) {
                if (!data) return;
                const reqBadge = document.getElementById('gt-sidebar-requests-badge');
                if (reqBadge && typeof data.pending_requests === 'number') {
                    reqBadge.textContent = String(data.pending_requests);
                    reqBadge.classList.toggle('hidden', data.pending_requests <= 0);
                }

                const chatBadge = document.getElementById('gt-sidebar-chats-badge');
                if (chatBadge && typeof data.open_chats === 'number') {
                    chatBadge.textContent = String(data.open_chats);
                    chatBadge.classList.toggle('hidden', data.open_chats <= 0);
                }

                const bellDot = document.getElementById('gt-topbar-bell-dot');
                const bellLink = document.getElementById('gt-topbar-bell-link');
                const total = (data.pending_requests || 0) + (data.open_chats || 0);
                if (bellDot) bellDot.classList.toggle('hidden', total <= 0);
                if (bellLink) bellLink.title = 'Notificações (' + total + ')';
            }

            window.GT_AdminNotify = {
                isSoundEnabled: isSoundEnabled,
                setSoundEnabled: setSoundEnabled,
                playChime: playChime,
                showToast: showToast,
                notifyDesktop: notifyDesktop,
                updateGlobalCounters: updateGlobalCounters,
                readSeen: readSeen,
                writeSeen: writeSeen
            };

            // Sequential background polling across non-chat admin pages every 6s (never overlaps)
            if (!window.location.pathname.startsWith('/admin/atendimento')) {
                const summaryUrl = @json(route('admin.chat.summary', ['counts_only' => 1]));

                async function checkGlobalUpdates() {
                    try {
                        const resp = await fetch(summaryUrl, {
                            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                            credentials: 'same-origin'
                        });
                        if (!resp.ok) return;
                        const data = await resp.json();
                        if (!data || !data.ok) return;

                        updateGlobalCounters(data);

                        const prevConv = readSeen('gt_seen_conv_id');
                        const prevMsg = readSeen('gt_seen_msg_id');
                        const prevReq = readSeen('gt_seen_req_id');

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
                            showToast('Novo atendimento no chat!', 'Um visitante iniciou conversa no site (CRM Autônomo ativo). Clique para acompanhar.', @json(route('admin.chat.index')));
                            notifyDesktop('Novo atendimento GundjaTech', 'Um visitante iniciou conversa no site.', @json(route('admin.chat.index')));
                        } else if ((data.latest_request_id || 0) > prevReq) {
                            writeSeen('gt_seen_req_id', data.latest_request_id);
                            playChime();
                            showToast('Nova solicitação recebida!', 'Um novo lead chegou pelo site. Clique para abrir a fila.', @json(route('admin.requests.index')));
                            notifyDesktop('Nova solicitação GundjaTech', 'Um novo lead chegou pelo formulário do site.', @json(route('admin.requests.index')));
                        } else if ((data.latest_client_message_id || 0) > prevMsg) {
                            writeSeen('gt_seen_msg_id', data.latest_client_message_id);
                            playChime();
                            showToast('Nova mensagem de visitante', 'Há novas mensagens no chat ao vivo. Clique para abrir.', @json(route('admin.chat.index')));
                            notifyDesktop('Nova mensagem no chat', 'Há novas mensagens no chat ao vivo.', @json(route('admin.chat.index')));
                        }
                    } catch (e) {
                    } finally {
                        setTimeout(checkGlobalUpdates, 6000);
                    }
                }

                checkGlobalUpdates();
            }
        })();
        </script>
    @endif
    @stack('scripts')
</body>
</html>
