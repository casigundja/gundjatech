<!DOCTYPE html>
<html lang="pt-BR" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Portal do Cliente • GundjaTech')</title>
    <link rel="icon" type="image/svg+xml" href="/img/favicon.svg?v=gt-icon4">
    <link rel="icon" href="/favicon.ico?v=gt-icon4" sizes="any">
    <link rel="icon" href="/img/favicon-32x32.png?v=gt-icon4" type="image/png" sizes="32x32">
    <link rel="apple-touch-icon" href="/img/apple-touch-icon.png?v=gt-icon4" sizes="180x180">
    <meta name="theme-color" content="#063B5C">
    <link rel="preload" href="/fonts/ZalandoSansExpanded-Regular.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/fonts/ZalandoSansExpanded-Bold.woff2" as="font" type="font/woff2" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <link rel="stylesheet" href="/css/gt-panel.css?v=6">
    @livewireStyles
</head>
<body class="gt-panel bg-[#E7F0F5] text-[#063B5C] font-sans antialiased h-full flex overflow-hidden" x-data="{ sidebarOpen: false }">
    @php
        $portalUser = Auth::user();
        $canPortal = static fn (string $perm): bool => $portalUser->isAdmin() || $portalUser->hasPermission($perm);
    @endphp

    <!-- Mobile Backdrop -->
    <div x-show="sidebarOpen" x-cloak @click="sidebarOpen = false" class="fixed inset-0 z-40 bg-[#063B5C]/45 backdrop-blur-[2px] lg:hidden"></div>

    <!-- Portal Sidebar -->
    <aside :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'" class="gt-sidebar fixed inset-y-0 left-0 z-50 w-64 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0 shrink-0">
        <div class="flex flex-col min-h-0 flex-1">
            <!-- Brand Header -->
            <div class="gt-sidebar-head h-20 flex items-center justify-between px-5 shrink-0">
                <a href="{{ route('portal.dashboard') }}" class="flex items-center gap-2.5 no-underline">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 300" width="32" height="28" aria-hidden="true" class="shrink-0">
                        <defs>
                            <linearGradient id="gtPortMain" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#16749A"/>
                                <stop offset="100%" stop-color="#063B5C"/>
                            </linearGradient>
                            <linearGradient id="gtPortTop" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#0E5A7A"/>
                                <stop offset="100%" stop-color="#04263D"/>
                            </linearGradient>
                            <linearGradient id="gtPortGold" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="#FFE074"/>
                                <stop offset="100%" stop-color="#F2C230"/>
                            </linearGradient>
                        </defs>
                        <path d="M 236.00 0.00 L 138.00 0.00 C 119.17 0.33, 126.17 1.33, 123.00 2.00 C 119.83 2.67, 121.67 3.33, 119.00 4.00 C 116.33 4.67, 111.83 4.67, 107.00 6.00 C 102.17 7.33, 93.17 10.67, 90.00 12.00 C 86.83 13.33, 90.67 12.67, 88.00 14.00 C 85.33 15.33, 78.83 17.33, 74.00 20.00 C 69.17 22.67, 63.50 26.67, 59.00 30.00 C 54.50 33.33, 51.50 35.67, 47.00 40.00 C 42.50 44.33, 36.67 50.17, 32.00 56.00 C 27.33 61.83, 23.17 67.50, 19.00 75.00 C 14.83 82.50, 9.33 94.83, 7.00 101.00 C 4.67 107.17, 5.67 109.50, 5.00 112.00 C 4.33 114.50, 3.67 113.50, 3.00 116.00 C 2.33 118.50, 1.33 121.00, 1.00 127.00 L 1.00 152.00 L 2.00 145.00 C 3.17 141.17, 4.33 135.83, 8.00 129.00 C 11.67 122.17, 18.83 110.83, 24.00 104.00 C 29.17 97.17, 32.50 93.67, 39.00 88.00 C 45.50 82.33, 53.83 75.50, 63.00 70.00 C 72.17 64.50, 85.33 58.33, 94.00 55.00 C 102.67 51.67, 109.33 51.67, 115.00 50.00 C 120.67 48.33, 122.50 46.33, 128.00 45.00 C 133.50 43.67, 139.00 42.50, 148.00 42.00 C 157.00 41.50, 174.50 42.50, 182.00 42.00 C 189.50 41.50, 189.83 40.33, 193.00 39.00 C 196.17 37.67, 193.83 40.50, 201.00 34.00 L 236.00 0.00 Z" fill="url(#gtPortTop)"/>
                        <path d="M 15.00 118.00 C 10.67 125.00, 7.33 133.00, 5.00 139.00 C 2.67 145.00, 1.33 148.00, 1.00 154.00 C 0.67 160.00, 1.50 167.67, 3.00 175.00 C 4.50 182.33, 7.00 190.50, 10.00 198.00 C 13.00 205.50, 17.17 213.67, 21.00 220.00 C 24.83 226.33, 27.67 230.17, 33.00 236.00 C 38.33 241.83, 45.33 249.17, 53.00 255.00 C 60.67 260.83, 71.00 267.00, 79.00 271.00 C 87.00 275.00, 93.33 277.00, 101.00 279.00 C 108.67 281.00, 104.50 283.00, 125.00 283.00 C 145.50 283.00, 203.50 281.33, 224.00 279.00 C 244.50 276.67, 242.17 272.00, 248.00 269.00 C 253.83 266.00, 255.00 264.67, 259.00 261.00 C 263.00 257.33, 268.33 252.00, 272.00 247.00 C 275.67 242.00, 278.83 235.67, 281.00 231.00 C 283.17 226.33, 284.17 233.83, 285.00 219.00 C 285.83 204.17, 286.50 155.67, 286.00 142.00 L 282.00 137.00 L 167.00 137.00 C 146.17 138.33, 161.00 138.50, 157.00 145.00 L 143.00 176.00 L 228.00 176.00 C 242.50 176.33, 229.67 170.67, 230.00 178.00 C 230.33 185.33, 230.67 209.50, 230.00 220.00 C 229.33 230.50, 228.17 235.00, 226.00 241.00 C 223.83 247.00, 220.00 252.00, 217.00 256.00 C 214.00 260.00, 212.00 262.00, 208.00 265.00 C 204.00 268.00, 196.17 272.50, 193.00 274.00 L 189.00 274.00 L 187.00 271.00 L 190.00 267.00 L 188.00 264.00 L 190.00 263.00 L 190.00 252.00 C 190.50 249.33, 193.00 250.00, 193.00 247.00 L 190.00 234.00 L 158.00 238.00 C 146.17 238.00, 129.33 236.33, 119.00 234.00 C 108.67 231.67, 103.67 228.83, 96.00 224.00 C 88.33 219.17, 79.00 211.33, 73.00 205.00 C 67.00 198.67, 63.17 191.67, 60.00 186.00 C 56.83 180.33, 55.67 177.17, 54.00 171.00 C 52.33 164.83, 50.33 156.50, 50.00 149.00 C 49.67 141.50, 50.67 133.00, 52.00 126.00 C 53.33 119.00, 54.67 114.17, 58.00 107.00 C 61.33 99.83, 67.17 89.67, 72.00 83.00 C 76.83 76.33, 80.67 72.17, 87.00 67.00 L 110.00 52.00 L 84.00 60.00 C 74.67 64.17, 62.83 70.83, 54.00 77.00 C 45.17 83.17, 37.50 90.17, 31.00 97.00 C 24.50 103.83, 19.33 111.00, 15.00 118.00 Z" fill="url(#gtPortMain)"/>
                        <path d="M 323.00 54.00 C 320.83 50.33, 315.83 44.67, 313.00 42.00 C 310.17 39.33, 308.17 39.00, 306.00 38.00 C 303.83 37.00, 303.33 36.33, 300.00 36.00 C 296.67 35.67, 289.50 35.67, 286.00 36.00 C 282.50 36.33, 281.67 36.83, 279.00 38.00 C 276.33 39.17, 273.67 39.83, 270.00 43.00 C 266.33 46.17, 260.17 54.17, 257.00 57.00 C 253.83 59.83, 269.33 59.33, 251.00 60.00 C 232.67 60.67, 165.83 60.67, 147.00 61.00 C 128.17 61.33, 142.67 60.83, 138.00 62.00 C 133.33 63.17, 124.50 65.67, 119.00 68.00 C 113.50 70.33, 109.83 72.50, 105.00 76.00 C 100.17 79.50, 94.17 84.50, 90.00 89.00 C 85.83 93.50, 82.83 98.33, 80.00 103.00 C 77.17 107.67, 74.83 112.00, 73.00 117.00 C 71.17 122.00, 69.50 130.00, 69.00 133.00 C 68.50 136.00, 70.00 131.67, 70.00 135.00 C 70.00 138.33, 68.33 146.83, 69.00 153.00 C 69.67 159.17, 72.00 166.67, 74.00 172.00 C 76.00 177.33, 78.00 180.67, 81.00 185.00 C 84.00 189.33, 87.33 193.83, 92.00 198.00 C 96.67 202.17, 104.67 207.33, 109.00 210.00 C 113.33 212.67, 116.00 213.33, 118.00 214.00 L 121.00 214.00 L 109.00 202.00 C 106.00 198.50, 105.33 198.33, 103.00 193.00 C 100.67 187.67, 96.33 177.67, 95.00 170.00 C 93.67 162.33, 94.33 153.17, 95.00 147.00 C 95.67 140.83, 97.00 137.67, 99.00 133.00 C 101.00 128.33, 103.50 123.50, 107.00 119.00 C 110.50 114.50, 115.83 109.33, 120.00 106.00 C 124.17 102.67, 127.83 100.83, 132.00 99.00 C 136.17 97.17, 123.83 95.67, 145.00 95.00 C 166.17 94.33, 237.33 93.33, 259.00 95.00 C 280.67 96.67, 271.33 103.00, 275.00 105.00 C 278.67 107.00, 277.83 106.67, 281.00 107.00 C 284.17 107.33, 289.33 108.00, 294.00 107.00 C 298.67 106.00, 305.33 103.00, 309.00 101.00 C 312.67 99.00, 313.67 97.67, 316.00 95.00 C 318.33 92.33, 321.33 88.50, 323.00 85.00 C 324.67 81.50, 325.50 77.50, 326.00 74.00 C 326.50 70.50, 326.50 67.33, 326.00 64.00 C 325.50 60.67, 325.17 57.67, 323.00 54.00 Z M 289.00 55.00 C 290.33 54.83, 292.67 54.83, 294.00 55.00 C 295.33 55.17, 296.17 55.67, 297.00 56.00 C 297.83 56.33, 298.17 56.50, 299.00 57.00 C 299.83 57.50, 301.17 58.33, 302.00 59.00 C 302.83 59.67, 303.33 60.00, 304.00 61.00 C 304.67 62.00, 305.50 63.67, 306.00 65.00 C 306.50 66.33, 306.83 68.00, 307.00 69.00 C 307.17 70.00, 307.17 69.83, 307.00 71.00 C 306.83 72.17, 306.50 74.50, 306.00 76.00 C 305.50 77.50, 305.17 78.50, 304.00 80.00 C 302.83 81.50, 300.50 83.83, 299.00 85.00 C 297.50 86.17, 297.50 86.67, 295.00 87.00 C 292.50 87.33, 286.17 87.17, 284.00 87.00 C 281.83 86.83, 283.33 87.17, 282.00 86.00 C 280.67 84.83, 277.17 81.33, 276.00 80.00 C 274.83 78.67, 275.33 78.83, 275.00 78.00 C 274.67 77.17, 274.17 76.33, 274.00 75.00 C 273.83 73.67, 273.67 71.83, 274.00 70.00 C 274.33 68.17, 274.67 66.00, 276.00 64.00 C 277.33 62.00, 280.33 59.33, 282.00 58.00 C 283.67 56.67, 284.83 56.50, 286.00 56.00 C 287.17 55.50, 287.67 55.17, 289.00 55.00 Z" fill="url(#gtPortGold)"/>
                        <circle cx="290.5" cy="71.4" r="15.1" fill="#F2C230"/>
                    </svg>
                    <span class="gt-brand-word">Gundja<span>Tech</span></span>
                </a>
                <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#FEF7DC] text-[#9A6B00] border border-[#F2C230]/50">Cliente</span>
            </div>

            <!-- Client Badge -->
            <div class="px-5 py-3.5 bg-[#F2F7FA] border-b border-[#CFE0EB] shrink-0">
                <span class="text-[10px] text-[#67879C] uppercase font-bold tracking-wider block">Área do Cliente</span>
                <span class="text-xs font-bold text-[#063B5C] truncate block mt-0.5">{{ Auth::user()->client ? Auth::user()->client->display_name : Auth::user()->name }}</span>
            </div>

            <!-- Navigation Links -->
            <nav class="p-3.5 space-y-1 overflow-y-auto flex-1">
                <a href="{{ route('portal.dashboard') }}" class="gt-nav-item {{ request()->routeIs('portal.dashboard') ? 'is-active' : '' }}">
                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                    <span>Início & Resumo</span>
                </a>

                @if($canPortal('portal.requests.manage') || $canPortal('portal.projects.view') || $canPortal('portal.quotations.approve'))
                    <div class="gt-nav-section">Projetos & Pedidos</div>
                @endif

                @if($canPortal('portal.requests.manage'))
                    <a href="{{ route('portal.requests.index') }}" class="gt-nav-item {{ request()->routeIs('portal.requests*') ? 'is-active' : '' }}">
                        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                        <span>Minhas Solicitações</span>
                    </a>
                @endif

                @if($canPortal('portal.projects.view'))
                    <a href="{{ route('portal.projects.index') }}" class="gt-nav-item {{ request()->routeIs('portal.projects*') ? 'is-active' : '' }}">
                        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        <span>Meus Projetos</span>
                    </a>
                @endif

                @if($canPortal('portal.quotations.approve'))
                    <a href="{{ route('portal.quotations.index') }}" class="gt-nav-item {{ request()->routeIs('portal.quotations*') ? 'is-active' : '' }}">
                        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span>Orçamentos Recebidos</span>
                    </a>
                @endif

                @if($canPortal('portal.domains.view') || $canPortal('portal.campaigns.view') || $canPortal('portal.finance.view') || $canPortal('portal.chat.manage'))
                    <div class="gt-nav-section">Ativos & Suporte</div>
                @endif

                @if($canPortal('portal.domains.view'))
                    <a href="{{ route('portal.domains.index') }}" class="gt-nav-item {{ request()->routeIs('portal.domains*') ? 'is-active' : '' }}">
                        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
                        <span>Meus Domínios</span>
                    </a>
                @endif

                @if($canPortal('portal.campaigns.view'))
                    <a href="{{ route('portal.campaigns.index') }}" class="gt-nav-item {{ request()->routeIs('portal.campaigns*') ? 'is-active' : '' }}">
                        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                        <span>Tráfego & Anúncios</span>
                    </a>
                @endif

                @if($canPortal('portal.finance.view'))
                    <a href="{{ route('portal.finance.index') }}" class="gt-nav-item {{ request()->routeIs('portal.finance*') ? 'is-active' : '' }}">
                        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span>Financeiro & Faturas</span>
                    </a>
                @endif

                @if($canPortal('portal.chat.manage'))
                    <a href="{{ route('portal.chat.index') }}" class="gt-nav-item {{ request()->routeIs('portal.chat*') ? 'is-active' : '' }}">
                        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                        <span>Falar com Atendimento</span>
                    </a>
                @endif
                <a href="{{ route('account.edit') }}" class="gt-nav-item {{ request()->routeIs('account.*') ? 'is-active' : '' }}">
                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    <span>Minha Conta</span>
                </a>
            </nav>
        </div>

        <!-- Footer Profile -->
        <div class="p-3.5 border-t border-[#CFE0EB] bg-[#F2F7FA]">
            <div class="flex items-center justify-between gap-2">
                <a href="{{ route('account.edit') }}" class="flex items-center gap-2.5 truncate no-underline group">
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#063B5C] to-[#16749A] text-[#F2C230] font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                        {{ strtoupper(substr(Auth::user()->name, 0, 1)) }}
                    </div>
                    <div class="truncate">
                        <span class="text-xs font-bold text-[#063B5C] group-hover:text-[#16749A] block truncate">{{ Auth::user()->name }}</span>
                        <span class="text-[10px] text-[#527287] truncate block">{{ Auth::user()->email }}</span>
                    </div>
                </a>
                <form action="{{ route('logout') }}" method="POST">
                    @csrf
                    <button type="submit" title="Sair" class="text-[#527287] hover:text-red-600 hover:bg-red-50 rounded-lg p-1.5 transition cursor-pointer">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                    </button>
                </form>
            </div>
        </div>
    </aside>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <!-- Topbar -->
        <header class="gt-topbar h-20 flex items-center justify-between px-4 sm:px-7 shrink-0 gap-3">
            <div class="flex items-center gap-3 min-w-0">
                <button @click="sidebarOpen = !sidebarOpen" class="text-[#527287] hover:text-[#063B5C] lg:hidden shrink-0 p-1.5 rounded-lg hover:bg-[#EEF5F9] cursor-pointer" aria-label="Abrir menu">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
                <h1 class="gt-topbar-title text-base sm:text-lg font-bold truncate">@yield('header_title', 'Painel do Cliente')</h1>
            </div>

            <div class="flex items-center gap-2 sm:gap-3 shrink-0">
                <a href="{{ route('home') }}" target="_blank" class="hidden md:inline-flex items-center gap-1.5 text-xs text-[#36576E] hover:text-[#063B5C] px-3 py-2 rounded-lg hover:bg-[#EEF5F9] transition font-semibold">
                    <span>Ver Site</span>
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                </a>
                @if(Auth::user()->isAdmin())
                    <a href="{{ route('admin.dashboard') }}" class="hidden sm:inline-flex items-center gap-1.5 text-xs bg-white hover:bg-[#EEF5F9] text-[#063B5C] font-semibold px-3 py-2 rounded-lg border border-[#B6CDD9] hover:border-[#16749A] hover:text-[#16749A] transition">
                        <span>Painel Admin</span>
                    </a>
                @endif
                @if($canPortal('portal.requests.manage'))
                    <a href="{{ route('portal.requests.create') }}" class="btn-primary px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5">
                        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                        <span class="hidden sm:inline">Nova Demanda</span>
                    </a>
                @endif
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
                        <div class="bg-white/95 backdrop-blur-md border border-emerald-300 rounded-2xl shadow-2xl shadow-emerald-950/15 p-3.5 flex items-center justify-between gap-3 text-xs">
                            <div class="flex items-center gap-3 min-w-0">
                                <span class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0 shadow-sm">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                                </span>
                                <div class="min-w-0">
                                    <span class="font-bold text-[#063B5C] block">Sucesso!</span>
                                    <span class="text-[#36576E] block truncate">{{ session('success') }}</span>
                                </div>
                            </div>
                            <button type="button" @click="show = false" class="text-[#527287] hover:text-[#063B5C] hover:bg-slate-100 p-1.5 rounded-lg transition shrink-0 cursor-pointer" title="Fechar aviso">
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
                        <div class="bg-white/95 backdrop-blur-md border border-red-300 rounded-2xl shadow-2xl shadow-red-950/15 p-3.5 flex items-center justify-between gap-3 text-xs">
                            <div class="flex items-center gap-3 min-w-0">
                                <span class="w-8 h-8 rounded-xl bg-red-50 text-red-600 border border-red-200/80 flex items-center justify-center shrink-0 shadow-sm">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                                </span>
                                <div class="min-w-0">
                                    <span class="font-bold text-red-900 block">Atenção!</span>
                                    <span class="text-red-700 block truncate">{{ session('error') }}</span>
                                </div>
                            </div>
                            <button type="button" @click="show = false" class="text-red-400 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition shrink-0 cursor-pointer" title="Fechar aviso">
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
                        <div class="bg-white/95 backdrop-blur-md border border-red-300 rounded-2xl shadow-2xl shadow-red-950/15 p-3.5 sm:p-4 text-xs space-y-2">
                            <div class="flex items-center justify-between gap-3">
                                <div class="flex items-center gap-2.5">
                                    <span class="w-7 h-7 rounded-lg bg-red-50 text-red-600 border border-red-200/80 flex items-center justify-center shrink-0">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                    </span>
                                    <span class="font-bold text-red-900">Verifique os campos informados:</span>
                                </div>
                                <button type="button" @click="show = false" class="text-red-400 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition shrink-0 cursor-pointer" title="Fechar aviso">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                </button>
                            </div>
                            <ul class="list-disc list-inside space-y-0.5 text-red-700 pl-1">
                                @foreach($errors->all() as $error)
                                    <li>{{ $error }}</li>
                                @endforeach
                            </ul>
                        </div>
                    </div>
                @endif
            </div>
        @endif

        <main class="flex-1 overflow-y-auto p-4 sm:p-7 space-y-6">
            @yield('content')
        </main>
    </div>

    @livewireScripts
    @stack('scripts')
</body>
</html>
