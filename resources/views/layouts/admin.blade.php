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
    <link rel="stylesheet" href="/css/gt-admin.css?v=7">
    <script>
        (function () {
            try {
                var saved = localStorage.getItem('gt_admin_theme') || 'dark';
                document.documentElement.setAttribute('data-admin-theme', saved);
                if (saved === 'dark') {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            } catch (e) {}
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
        theme: localStorage.getItem('gt_admin_theme') || 'dark',
        setTheme(val) {
            this.theme = val;
            try { localStorage.setItem('gt_admin_theme', val); } catch (e) {}
            document.documentElement.setAttribute('data-admin-theme', val);
            document.documentElement.classList.toggle('dark', val === 'dark');
        },
        toggleTheme() {
            this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
        }
    }"
    :class="theme === 'light' ? 'is-light-mode' : 'is-dark-mode'"
>
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
                    <span x-show="!sidebarCollapsed" class="gt-font-display text-sm font-bold tracking-tight text-white">
                        Gundja<span class="text-[#F2C230] font-normal">Tech</span>
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
                            <span x-show="!sidebarCollapsed" class="gtb-count-circle">{{ $adminPendingRequestsCount }}</span>
                        @endif
                    </a>
                @endif

                <!-- Section 2: WORKSPACES / ECOSSISTEMA -->
                <div class="gtb-section-head pt-4 border-t border-white/5 mt-2">
                    <span x-show="!sidebarCollapsed">Workspaces</span>
                    <span x-show="sidebarCollapsed" x-cloak class="mx-auto">W</span>
                    <a x-show="!sidebarCollapsed" href="{{ route('admin.quotations.create') }}" class="text-[#8C95AA] hover:text-[#F2C230] no-underline text-xs font-bold" title="Novo Orçamento">+</a>
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
                        <a href="{{ route('admin.chat.index') }}" class="gtb-nav-item {{ request()->routeIs('admin.chat*') ? 'is-active' : '' }}" title="Atendimento & Suporte">
                            <div class="flex items-center gap-3">
                                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                <span x-show="!sidebarCollapsed">Suporte & Chat</span>
                            </div>
                            @if(($adminOpenChatsCount ?? 0) > 0)
                                <span x-show="!sidebarCollapsed" class="gtb-count-circle">{{ $adminOpenChatsCount }}</span>
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

        <!-- Bottom Promo Card ("ELEVATE YOUR INSIGHTS" adapted to GundjaTech) -->
        <div x-show="!sidebarCollapsed" class="gtb-promo-card">
            <div class="text-[10.5px] font-bold tracking-wider uppercase text-white/90 leading-snug">
                ELEVE SUA OPERAÇÃO<br>
                COM <strong class="text-[#F2C230]">GUNDJATECH AI ✦</strong>
            </div>
            <a href="{{ route('admin.quotations.create') }}" class="gtb-promo-btn">
                <span>Novo Orçamento</span>
                <span class="text-[#E4A318]">♛</span>
            </a>
        </div>
        <div x-show="sidebarCollapsed" x-cloak class="p-3 flex justify-center">
            <a href="{{ route('admin.quotations.create') }}" class="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F2C230] to-[#121AFF] text-[#0B0E1A] flex items-center justify-center font-extrabold no-underline shadow-lg" title="Novo Orçamento">
                ♛
            </a>
        </div>
    </aside>

    <!-- Main Workspace Area -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <!-- Top Header Bar (Title on left; Search + KBD + Theme Pill + Bell + User Profile on right) -->
        <header class="gtb-topbar">
            <div class="flex items-center gap-3 min-w-0">
                <button @click="sidebarOpen = !sidebarOpen" class="gtb-mobile-toggle p-2 rounded-xl bg-[#171B27] border border-white/10 text-white" aria-label="Abrir menu">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
                <h1 class="gt-font-display text-lg sm:text-xl font-bold text-white tracking-tight truncate">
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
                        @click="setTheme('dark')"
                        :class="theme === 'dark' ? 'is-active' : ''"
                        class="gtb-theme-orb cursor-pointer border-0"
                        title="Modo Escuro"
                        aria-label="Ativar modo escuro"
                    >
                        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
                    </button>
                </div>

                <!-- Notification Bell with Glowing Dot -->
                <a href="{{ route('admin.requests.index') }}" class="relative w-10 h-10 rounded-full bg-[#171B27] border border-white/10 flex items-center justify-center text-[#D5DCEB] hover:border-[#F2C230] hover:text-[#F2C230] transition" title="Notificações ({{ $totalNotifications }})">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                    <span class="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399]"></span>
                </a>

                <span class="h-6 w-px bg-white/10 hidden sm:inline-block"></span>

                <!-- User Name, Email & Avatar Dropdown -->
                <div class="relative" @click.away="profileOpen = false">
                    <button type="button" @click="profileOpen = !profileOpen" class="flex items-center gap-3 cursor-pointer text-right">
                        <div class="hidden sm:block leading-tight">
                            <div class="text-xs font-bold text-white">{{ $currentUser->name }}</div>
                            <div class="text-[10.5px] text-[#8C95AA]">{{ $currentUser->email }}</div>
                        </div>
                        <div class="w-9 h-9 rounded-full bg-gradient-to-br from-[#F2C230] to-[#34D399] p-0.5 shadow-md shrink-0">
                            <div class="w-full h-full rounded-full bg-[#171B27] flex items-center justify-center text-xs font-extrabold text-[#F2C230]">
                                {{ strtoupper(substr($currentUser->name, 0, 2)) }}
                            </div>
                        </div>
                    </button>

                    <div x-show="profileOpen" x-cloak class="absolute right-0 mt-2 w-52 bg-[#1A1F2E] rounded-2xl shadow-2xl border border-white/10 py-2 z-50 text-xs font-semibold text-gray-200">
                        <a href="{{ route('home') }}" target="_blank" class="block px-4 py-2 hover:bg-white/5 text-gray-200 no-underline">Ver Site Público &nearr;</a>
                        @if($currentUser->isAdmin() || $currentUser->hasPermission('portal.access'))
                            <a href="{{ route('portal.dashboard') }}" target="_blank" class="block px-4 py-2 hover:bg-white/5 text-gray-200 no-underline">Portal do Cliente &nearr;</a>
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
            <div class="px-6 pt-1">
                <div class="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-2xl flex items-center gap-2.5">
                    <svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                    <span>{{ session('success') }}</span>
                </div>
            </div>
        @endif
        @if(session('error'))
            <div class="px-6 pt-1">
                <div class="p-3.5 bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold rounded-2xl flex items-center gap-2.5">
                    <svg class="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    <span>{{ session('error') }}</span>
                </div>
            </div>
        @endif
        @if($errors->any())
            <div class="px-6 pt-1">
                <div class="p-3.5 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-2xl space-y-1">
                    <div class="font-bold text-red-200">Verifique os campos informados:</div>
                    <ul class="list-disc list-inside space-y-0.5">
                        @foreach($errors->all() as $error)
                            <li>{{ $error }}</li>
                        @endforeach
                    </ul>
                </div>
            </div>
        @endif

        <!-- Main Scrollable Content -->
        <main class="flex-1 overflow-y-auto px-4 sm:px-6 pb-8 pt-1 space-y-5">
            @yield('content')
        </main>
    </div>

    @livewireScripts
    @stack('scripts')
</body>
</html>
