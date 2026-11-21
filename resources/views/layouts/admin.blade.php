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
    <link rel="stylesheet" href="/css/gt-admin.css?v=17">
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
        notificationsOpen: false,
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
            <a href="{{ $sidebarCtaUrl }}" class="w-10 h-10 rounded-xl text-[#063B5C] flex items-center justify-center font-extrabold no-underline shadow-lg" style="background: linear-gradient(135deg, #F2C230 0%, #E0B020 100%);" title="{{ $sidebarCtaLabel }}">
                ♛
            </a>
        </div>
    </aside>

    <!-- Main Workspace Area -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <!-- Top Header Bar (Title on left; Search + KBD + Theme Pill + Bell + User Profile on right) -->
        <header class="gtb-topbar relative z-[80]" style="position: relative; z-index: 80;">
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
                @if($currentUser->hasPermission('requests.view'))
                    <form action="{{ route('admin.requests.index') }}" method="GET" class="gtb-search-box hidden md:flex">
                        <svg class="w-4 h-4 text-[#8C95AA] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <input type="text" name="search" value="{{ request('search') }}" placeholder="Pesquisar demandas, clientes..." aria-label="Pesquisar">
                        <span class="gtb-kbd-pill">⌘ F</span>
                    </form>
                @endif

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

                <!-- Notification Bell with Interactive Dropdown Panel -->
                @if($currentUser->hasAnyPermission(['requests.view', 'chat.view']))
                    <div class="relative" @click.away="notificationsOpen = false" @keydown.escape.window="notificationsOpen = false">
                        <button
                            type="button"
                            id="gt-topbar-bell-link"
                            @click="notificationsOpen = !notificationsOpen; if (notificationsOpen) profileOpen = false"
                            :aria-expanded="notificationsOpen ? 'true' : 'false'"
                            aria-haspopup="true"
                            class="gtb-icon-btn relative cursor-pointer"
                            title="Notificações ({{ $totalNotifications }})"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                            <span id="gt-topbar-bell-dot" class="{{ $totalNotifications > 0 ? '' : 'hidden' }} absolute top-2 right-2.5 w-2 h-2 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399]"></span>
                        </button>

                        <!-- Notifications Dropdown Panel -->
                        <div
                            x-show="notificationsOpen"
                            x-cloak
                            id="gt-notif-dropdown"
                            data-csrf="{{ csrf_token() }}"
                            style="z-index: 120; width: min(24rem, calc(100vw - 2rem));"
                            class="gtb-dropdown gtb-notif-panel absolute right-0 mt-2.5 rounded-2xl shadow-2xl z-[120] overflow-hidden"
                        >
                            <!-- Dropdown Header -->
                            <div class="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
                                <div class="flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-[#F2C230]"></span>
                                    <span class="gt-font-display text-xs font-extrabold text-white whitespace-nowrap">Central de Notificações</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <button
                                        type="button"
                                        id="gt-notif-clear-all"
                                        class="text-[10.5px] font-bold text-[#8C95AA] hover:text-[#F2C230] transition cursor-pointer {{ empty($adminNotificationItems) ? 'hidden' : '' }}"
                                        title="Ocultar todas as notificações atuais da lista"
                                    >
                                        Limpar tudo
                                    </button>
                                </div>
                            </div>

                            <!-- Notification Feed List -->
                            <div id="gt-notif-list" class="max-h-80 overflow-y-auto divide-y divide-white/5">
                                @forelse($adminNotificationItems ?? [] as $item)
                                    @php
                                        $badgeClass = match ($item['badge_tone'] ?? 'blue') {
                                            'gold' => 'bg-[#F2C230]/20 text-[#F2C230] border border-[#F2C230]/40',
                                            'amber' => 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
                                            'emerald' => 'bg-emerald-500/15 text-[#6EE7B7] border border-emerald-500/30',
                                            default => 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
                                        };
                                        $itemKey = $item['key'] ?? (($item['type'] ?? 'notif') . ':' . ($item['id'] ?? $loop->index));
                                    @endphp
                                    <div class="gtb-notif-item flex items-start gap-3 px-4 py-3 transition" data-notif-key="{{ $itemKey }}" data-notif-time="{{ $item['time'] }}">
                                        <a href="{{ $item['url'] }}" class="flex items-start gap-3 min-w-0 flex-1 no-underline">
                                            <span class="gtb-icon-box {{ ($item['type'] ?? '') === 'chat' ? 'is-petrol' : '' }} !w-8 !h-8 !rounded-lg mt-0.5">
                                                @if(($item['type'] ?? '') === 'chat')
                                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                                                @else
                                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                                @endif
                                            </span>
                                            <div class="min-w-0 flex-1">
                                                <div class="flex items-center justify-between gap-2">
                                                    <span class="text-xs font-bold text-white truncate">{{ $item['title'] }}</span>
                                                    <span class="text-[9.5px] text-[#8C95AA] shrink-0">{{ $item['time'] }}</span>
                                                </div>
                                                <p class="text-[11px] text-[#8C95AA] truncate mt-0.5">{{ $item['subtitle'] }}</p>
                                                <span class="inline-block mt-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold {{ $badgeClass }}">
                                                    {{ $item['badge'] }}
                                                </span>
                                            </div>
                                        </a>

                                        @if(! empty($item['can_delete']) && ! empty($item['delete_url']))
                                            <div class="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
                                                <form
                                                    action="{{ $item['delete_url'] }}"
                                                    method="POST"
                                                    data-confirm-title="{{ $item['confirm_title'] ?? 'Confirmar exclusão' }}"
                                                    data-confirm-message="{{ $item['confirm_message'] ?? 'Tem certeza que deseja excluir este item permanentemente?' }}"
                                                    data-confirm-target="{{ $item['confirm_target'] ?? $item['title'] }}"
                                                    data-confirm-button="{{ $item['confirm_button'] ?? 'Sim, excluir' }}"
                                                    data-confirm-tone="danger"
                                                >
                                                    @csrf
                                                    @method('DELETE')
                                                    <button
                                                        type="submit"
                                                        class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition cursor-pointer"
                                                        title="Excluir permanentemente do banco de dados"
                                                    >
                                                        Excluir
                                                    </button>
                                                </form>
                                            </div>
                                        @endif
                                    </div>
                                @empty
                                    <div class="gtb-notif-empty px-6 py-8 flex flex-col items-center text-center">
                                        <span class="gtb-notif-empty-icon">
                                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M5 13l4 4L19 7"/></svg>
                                        </span>
                                        <div class="mt-3 text-[13px] font-extrabold text-white">Tudo em dia por aqui!</div>
                                        <p class="mt-1 text-[11.5px] leading-relaxed text-[#8C95AA] max-w-[16rem]">Nenhuma solicitação ou conversa pendente no momento.</p>
                                    </div>
                                @endforelse
                            </div>

                            <!-- Dropdown Footer Links -->
                            <div class="px-4 py-2.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-2 text-[11px] font-bold">
                                @if($currentUser->hasPermission('requests.view'))
                                    <a href="{{ route('admin.requests.index') }}" class="text-[#F2C230] hover:underline no-underline whitespace-nowrap">
                                        Ver Solicitações &rarr;
                                    </a>
                                @endif
                                @if($currentUser->hasPermission('chat.view'))
                                    <a href="{{ route('admin.chat.index') }}" class="text-[#D5DCEB] hover:text-[#F2C230] hover:underline no-underline ml-auto whitespace-nowrap">
                                        Abrir Chat ao Vivo &rarr;
                                    </a>
                                @endif
                            </div>
                        </div>
                    </div>
                @endif

                <span class="h-6 w-px bg-white/10 hidden sm:inline-block"></span>

                <!-- User Name, Email & Avatar Dropdown -->
                <div class="relative" @click.away="profileOpen = false">
                    <button type="button" @click="profileOpen = !profileOpen; if (profileOpen) notificationsOpen = false" class="flex items-center gap-3 cursor-pointer text-right">
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

                    <div x-show="profileOpen" x-cloak style="z-index: 120;" class="gtb-dropdown absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl py-2 z-[120] text-xs font-semibold">
                        <a href="{{ route('account.edit') }}" class="block px-4 py-2 no-underline">Minha Conta &amp; Senha</a>
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

        <!-- Live Toast Notifications (Top-Right Floating Stack) -->
        @if(session('success') || session('error') || $errors->any())
            <div class="fixed top-5 right-5 left-5 sm:left-auto sm:w-[420px] z-[9999] pointer-events-none flex flex-col gap-3" aria-live="polite">
                @if(session('success'))
                    <div
                        x-data="{
                            show: true,
                            timer: null,
                            startTimer() { this.timer = setTimeout(() => this.show = false, 4500); },
                            pauseTimer() { clearTimeout(this.timer); }
                        }"
                        x-show="show"
                        x-init="startTimer()"
                        @mouseenter="pauseTimer()"
                        @mouseleave="startTimer()"
                        x-transition:enter="transition ease-out duration-300"
                        x-transition:enter-start="opacity-0 translate-y-[-16px] sm:translate-y-0 sm:translate-x-8 scale-95"
                        x-transition:enter-end="opacity-100 translate-y-0 sm:translate-x-0 scale-100"
                        x-transition:leave="transition ease-in duration-200"
                        x-transition:leave-start="opacity-100 translate-y-0 sm:translate-x-0 scale-100"
                        x-transition:leave-end="opacity-0 translate-y-[-10px] sm:translate-y-0 sm:translate-x-8 scale-95"
                        class="pointer-events-auto"
                    >
                        <div class="gtb-card gtb-alert-card-success bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 rounded-2xl shadow-2xl shadow-black/40 p-3.5 flex items-center justify-between gap-3 text-xs">
                            <div class="flex items-center gap-3 min-w-0">
                                <span class="w-8 h-8 rounded-xl bg-emerald-500/20 text-[#6EE7B7] border border-emerald-500/40 flex items-center justify-center shrink-0 gtb-alert-icon">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                                </span>
                                <div class="min-w-0">
                                    <span class="font-bold text-white block gtb-alert-title">Sucesso!</span>
                                    <span class="text-[#D5DCEB] block truncate gtb-alert-msg">{{ session('success') }}</span>
                                </div>
                            </div>
                            <button type="button" @click="show = false" class="text-[#8C95AA] hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition shrink-0 cursor-pointer gtb-alert-close" title="Fechar aviso">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                    </div>
                @endif
                @if(session('error'))
                    <div
                        x-data="{
                            show: true,
                            timer: null,
                            startTimer() { this.timer = setTimeout(() => this.show = false, 6000); },
                            pauseTimer() { clearTimeout(this.timer); }
                        }"
                        x-show="show"
                        x-init="startTimer()"
                        @mouseenter="pauseTimer()"
                        @mouseleave="startTimer()"
                        x-transition:enter="transition ease-out duration-300"
                        x-transition:enter-start="opacity-0 translate-y-[-16px] sm:translate-y-0 sm:translate-x-8 scale-95"
                        x-transition:enter-end="opacity-100 translate-y-0 sm:translate-x-0 scale-100"
                        x-transition:leave="transition ease-in duration-200"
                        x-transition:leave-start="opacity-100 translate-y-0 sm:translate-x-0 scale-100"
                        x-transition:leave-end="opacity-0 translate-y-[-10px] sm:translate-y-0 sm:translate-x-8 scale-95"
                        class="pointer-events-auto"
                    >
                        <div class="gtb-card gtb-alert-card-error bg-red-950/80 backdrop-blur-md border border-red-500/40 rounded-2xl shadow-2xl shadow-black/40 p-3.5 flex items-center justify-between gap-3 text-xs">
                            <div class="flex items-center gap-3 min-w-0">
                                <span class="w-8 h-8 rounded-xl bg-red-500/20 text-red-300 border border-red-500/40 flex items-center justify-center shrink-0 gtb-alert-icon">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                                </span>
                                <div class="min-w-0">
                                    <span class="font-bold text-white block gtb-alert-title">Atenção!</span>
                                    <span class="text-red-200 block truncate gtb-alert-msg">{{ session('error') }}</span>
                                </div>
                            </div>
                            <button type="button" @click="show = false" class="text-[#8C95AA] hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition shrink-0 cursor-pointer gtb-alert-close" title="Fechar aviso">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                    </div>
                @endif
                @if($errors->any())
                    <div
                        x-data="{
                            show: true,
                            timer: null,
                            startTimer() { this.timer = setTimeout(() => this.show = false, 7500); },
                            pauseTimer() { clearTimeout(this.timer); }
                        }"
                        x-show="show"
                        x-init="startTimer()"
                        @mouseenter="pauseTimer()"
                        @mouseleave="startTimer()"
                        x-transition:enter="transition ease-out duration-300"
                        x-transition:enter-start="opacity-0 translate-y-[-16px] sm:translate-y-0 sm:translate-x-8 scale-95"
                        x-transition:enter-end="opacity-100 translate-y-0 sm:translate-x-0 scale-100"
                        x-transition:leave="transition ease-in duration-200"
                        x-transition:leave-start="opacity-100 translate-y-0 sm:translate-x-0 scale-100"
                        x-transition:leave-end="opacity-0 translate-y-[-10px] sm:translate-y-0 sm:translate-x-8 scale-95"
                        class="pointer-events-auto"
                    >
                        <div class="gtb-card gtb-alert-card-error bg-red-950/80 backdrop-blur-md border border-red-500/40 rounded-2xl shadow-2xl shadow-black/40 p-3.5 sm:p-4 text-xs space-y-2">
                            <div class="flex items-center justify-between gap-3">
                                <div class="flex items-center gap-2.5">
                                    <span class="w-7 h-7 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 flex items-center justify-center shrink-0 gtb-alert-icon">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                    </span>
                                    <span class="font-bold text-white gtb-alert-title">Verifique os campos informados:</span>
                                </div>
                                <button type="button" @click="show = false" class="text-[#8C95AA] hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition shrink-0 cursor-pointer gtb-alert-close" title="Fechar aviso">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                </button>
                            </div>
                            <ul class="list-disc list-inside space-y-0.5 text-red-200 pl-1 gtb-alert-list">
                                @foreach($errors->all() as $error)
                                    <li>{{ $error }}</li>
                                @endforeach
                            </ul>
                        </div>
                    </div>
                @endif
            </div>
        @endif

        <!-- Main Scrollable Content -->
        <main class="relative z-[10] flex-1 overflow-y-auto px-4 sm:px-6 pb-8 pt-4 space-y-5" style="position: relative; z-index: 10;">
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

        // Interactive Notification Center (Limpar individual / Limpar tudo / Excluir com confirmação)
        (function () {
            const STORAGE_KEY = 'gt_admin_dismissed_notifs_v1';
            const dropdown = document.getElementById('gt-notif-dropdown');
            const notifList = document.getElementById('gt-notif-list');
            const clearAllBtn = document.getElementById('gt-notif-clear-all');
            const totalPill = document.getElementById('gt-notif-total-pill');
            const bellDot = document.getElementById('gt-topbar-bell-dot');
            const bellLink = document.getElementById('gt-topbar-bell-link');
            if (!dropdown || !notifList) return;

            const csrfToken = dropdown.dataset.csrf || '';

            function getDismissed() {
                try {
                    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
                } catch (e) {
                    return {};
                }
            }

            function saveDismissed(map) {
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
                } catch (e) {}
            }

            function isItemDismissed(key, time) {
                if (!key) return false;
                const map = getDismissed();
                if (!Object.prototype.hasOwnProperty.call(map, key)) return false;
                if (key.startsWith('chat:') && time && map[key] !== true && map[key] !== time) {
                    return false;
                }
                return true;
            }

            function dismissKey(key, time) {
                if (!key) return;
                const map = getDismissed();
                map[key] = time || true;
                saveDismissed(map);
            }

            function clearDismissedHistory() {
                saveDismissed({});
            }

            function renderEmptyState(hasDismissedItems) {
                notifList.innerHTML = '';
                const emptyWrap = document.createElement('div');
                emptyWrap.className = 'gtb-notif-empty px-6 py-8 flex flex-col items-center text-center';
                const emptyIcon = document.createElement('span');
                emptyIcon.className = 'gtb-notif-empty-icon';
                emptyIcon.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M5 13l4 4L19 7"/></svg>';
                const emptyTitle = document.createElement('div');
                emptyTitle.className = 'mt-3 text-[13px] font-extrabold text-white';
                emptyTitle.textContent = 'Tudo em dia por aqui!';
                const emptySub = document.createElement('p');
                emptySub.className = 'mt-1 text-[11.5px] leading-relaxed text-[#8C95AA] max-w-[16rem]';
                emptySub.textContent = hasDismissedItems
                    ? 'Você limpou as notificações desta lista. Novas solicitações e conversas aparecerão aqui.'
                    : 'Nenhuma solicitação ou conversa pendente no momento.';
                emptyWrap.appendChild(emptyIcon);
                emptyWrap.appendChild(emptyTitle);
                emptyWrap.appendChild(emptySub);

                if (hasDismissedItems) {
                    const restoreBtn = document.createElement('button');
                    restoreBtn.type = 'button';
                    restoreBtn.className = 'gtb-notif-restore mt-4 cursor-pointer';
                    restoreBtn.textContent = 'Restaurar notificações ocultas';
                    restoreBtn.addEventListener('click', function (ev) {
                        ev.stopPropagation();
                        clearDismissedHistory();
                        window.location.reload();
                    });
                    emptyWrap.appendChild(restoreBtn);
                }

                notifList.appendChild(emptyWrap);
            }

            function syncVisibleHeaderState() {
                const rows = Array.from(notifList.querySelectorAll('.gtb-notif-item'));
                const visibleRows = rows.filter(function (r) { return !r.classList.contains('hidden'); });
                const count = visibleRows.length;

                if (clearAllBtn) {
                    clearAllBtn.classList.toggle('hidden', count === 0);
                }
                if (totalPill) {
                    totalPill.textContent = count + ' pendente(s)';
                }
                if (bellDot) {
                    bellDot.classList.toggle('hidden', count === 0);
                }
                if (bellLink) {
                    bellLink.title = 'Notificações (' + count + ')';
                }
                if (rows.length > 0 && count === 0) {
                    renderEmptyState(true);
                }
            }

            // Apply initial dismissed filter on page load
            Array.from(notifList.querySelectorAll('.gtb-notif-item')).forEach(function (row) {
                const key = row.dataset.notifKey || '';
                const time = row.dataset.notifTime || '';
                if (isItemDismissed(key, time)) {
                    row.remove();
                }
            });
            if (notifList.querySelectorAll('.gtb-notif-item').length === 0 && Object.keys(getDismissed()).length > 0) {
                renderEmptyState(true);
            }
            syncVisibleHeaderState();

            // Event delegation for "Limpar" button on individual items
            notifList.addEventListener('click', function (ev) {
                const dismissBtn = ev.target.closest('[data-notif-dismiss]');
                if (!dismissBtn) return;
                ev.preventDefault();
                ev.stopPropagation();

                const key = dismissBtn.getAttribute('data-notif-dismiss');
                const time = dismissBtn.getAttribute('data-notif-time') || '';
                dismissKey(key, time);

                const row = dismissBtn.closest('.gtb-notif-item');
                if (row) row.remove();
                syncVisibleHeaderState();
            });

            // "Limpar tudo" button in header
            if (clearAllBtn) {
                clearAllBtn.addEventListener('click', function (ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    Array.from(notifList.querySelectorAll('.gtb-notif-item')).forEach(function (row) {
                        dismissKey(row.dataset.notifKey || '', row.dataset.notifTime || '');
                        row.remove();
                    });
                    renderEmptyState(true);
                    syncVisibleHeaderState();
                });
            }

            function renderDynamicNotifications(items) {
                if (!Array.isArray(items)) return;
                const visibleItems = items.filter(function (item) {
                    const key = item.key || ((item.type || 'notif') + ':' + (item.id || '0'));
                    return !isItemDismissed(key, item.time || '');
                });

                notifList.innerHTML = '';
                if (visibleItems.length === 0) {
                    renderEmptyState(items.length > 0);
                    syncVisibleHeaderState();
                    return;
                }

                visibleItems.forEach(function (item) {
                    const key = item.key || ((item.type || 'notif') + ':' + (item.id || '0'));
                    const row = document.createElement('div');
                    row.className = 'gtb-notif-item flex items-start gap-3 px-4 py-3 transition';
                    row.dataset.notifKey = key;
                    row.dataset.notifTime = item.time || '';

                    const mainLink = document.createElement('a');
                    mainLink.href = item.url || '#';
                    mainLink.className = 'flex items-start gap-3 min-w-0 flex-1 no-underline';

                    const iconWrap = document.createElement('span');
                    const isChat = item.type === 'chat';
                    iconWrap.className = 'gtb-icon-box ' + (isChat ? 'is-petrol ' : '') + '!w-8 !h-8 !rounded-lg mt-0.5';
                    iconWrap.innerHTML = isChat
                        ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>'
                        : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>';

                    const body = document.createElement('div');
                    body.className = 'min-w-0 flex-1';

                    const topLine = document.createElement('div');
                    topLine.className = 'flex items-center justify-between gap-2';
                    const titleEl = document.createElement('span');
                    titleEl.className = 'text-xs font-bold text-white truncate';
                    titleEl.textContent = item.title || '';
                    const timeEl = document.createElement('span');
                    timeEl.className = 'text-[9.5px] text-[#8C95AA] shrink-0';
                    timeEl.textContent = item.time || '';
                    topLine.appendChild(titleEl);
                    topLine.appendChild(timeEl);

                    const subEl = document.createElement('p');
                    subEl.className = 'text-[11px] text-[#8C95AA] truncate mt-0.5';
                    subEl.textContent = item.subtitle || '';

                    const badgeEl = document.createElement('span');
                    let toneClass = 'bg-sky-500/15 text-sky-300 border border-sky-500/30';
                    if (item.badge_tone === 'gold') toneClass = 'bg-[#F2C230]/20 text-[#F2C230] border border-[#F2C230]/40';
                    else if (item.badge_tone === 'amber') toneClass = 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
                    else if (item.badge_tone === 'emerald') toneClass = 'bg-emerald-500/15 text-[#6EE7B7] border border-emerald-500/30';
                    badgeEl.className = 'inline-block mt-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold ' + toneClass;
                    badgeEl.textContent = item.badge || '';

                    body.appendChild(topLine);
                    body.appendChild(subEl);
                    body.appendChild(badgeEl);
                    mainLink.appendChild(iconWrap);
                    mainLink.appendChild(body);
                    row.appendChild(mainLink);

                    if (item.can_delete && item.delete_url) {
                        const actionsCol = document.createElement('div');
                        actionsCol.className = 'flex flex-col items-end gap-1.5 shrink-0 pt-0.5';

                        const delForm = document.createElement('form');
                        delForm.action = item.delete_url;
                        delForm.method = 'POST';
                        delForm.dataset.confirmTitle = item.confirm_title || 'Confirmar exclusão';
                        delForm.dataset.confirmMessage = item.confirm_message || 'Tem certeza que deseja excluir este item permanentemente?';
                        delForm.dataset.confirmTarget = item.confirm_target || item.title || '';
                        delForm.dataset.confirmButton = item.confirm_button || 'Sim, excluir';
                        delForm.dataset.confirmTone = 'danger';

                        const csrfInput = document.createElement('input');
                        csrfInput.type = 'hidden';
                        csrfInput.name = '_token';
                        csrfInput.value = csrfToken;

                        const methodInput = document.createElement('input');
                        methodInput.type = 'hidden';
                        methodInput.name = '_method';
                        methodInput.value = 'DELETE';

                        const delBtn = document.createElement('button');
                        delBtn.type = 'submit';
                        delBtn.className = 'px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition cursor-pointer';
                        delBtn.title = 'Excluir permanentemente do banco de dados';
                        delBtn.textContent = 'Excluir';

                        delForm.appendChild(csrfInput);
                        delForm.appendChild(methodInput);
                        delForm.appendChild(delBtn);
                        actionsCol.appendChild(delForm);
                        row.appendChild(actionsCol);
                    }

                    notifList.appendChild(row);
                });

                syncVisibleHeaderState();
            }

            window.GT_NotifCenter = {
                renderList: renderDynamicNotifications
            };
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

                const notifReqCount = document.getElementById('gt-notif-req-count');
                if (notifReqCount && typeof data.pending_requests === 'number') {
                    notifReqCount.textContent = String(data.pending_requests);
                }

                const notifChatCount = document.getElementById('gt-notif-chat-count');
                if (notifChatCount && typeof data.open_chats === 'number') {
                    notifChatCount.textContent = String(data.open_chats);
                }

                if (window.GT_NotifCenter && Array.isArray(data.notifications)) {
                    window.GT_NotifCenter.renderList(data.notifications);
                } else {
                    const bellDot = document.getElementById('gt-topbar-bell-dot');
                    const bellLink = document.getElementById('gt-topbar-bell-link');
                    const total = (data.pending_requests || 0) + (data.open_chats || 0);
                    if (bellDot) bellDot.classList.toggle('hidden', total <= 0);
                    if (bellLink) bellLink.title = 'Notificações (' + total + ')';
                    const totalPill = document.getElementById('gt-notif-total-pill');
                    if (totalPill) totalPill.textContent = total + ' pendente(s)';
                }
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
