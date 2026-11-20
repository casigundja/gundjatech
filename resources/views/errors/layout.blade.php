<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('code') • @yield('title') | GundjaTech</title>
    <link rel="icon" type="image/svg+xml" href="/img/favicon.svg">
    <link rel="preload" href="/fonts/ZalandoSansExpanded-Bold.woff2" as="font" type="font/woff2" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        @font-face {
            font-family: "ZSE";
            src: url("/fonts/ZalandoSansExpanded-Bold.woff2") format("woff2");
            font-weight: 700;
            font-display: swap;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            min-height: 100vh;
            font-family: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
            background:
                radial-gradient(60% 55% at 22% 24%, rgba(228, 163, 24, .22), transparent 65%),
                radial-gradient(50% 50% at 85% 80%, rgba(18, 26, 255, .14), transparent 65%),
                #06070E;
            color: #FFFFFF;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }
        .gt-err-card {
            width: 100%;
            max-width: 520px;
            background: #FFFFFF;
            color: #1C1508;
            border-radius: 24px;
            padding: 40px 36px;
            box-shadow: 0 32px 80px -20px rgba(0, 0, 0, .65), 0 0 0 1px rgba(242, 194, 48, .22);
            text-align: center;
        }
        .gt-err-brand {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            text-decoration: none;
            margin-bottom: 24px;
        }
        .gt-err-brand span {
            font-family: "ZSE", "Plus Jakarta Sans", sans-serif;
            font-size: 18px;
            font-weight: 700;
            color: #1C1508;
            letter-spacing: -.03em;
        }
        .gt-err-brand span em {
            font-style: normal;
            color: #B87D0A;
        }
        .gt-err-code {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 14px;
            border-radius: 999px;
            background: #FDF5E2;
            border: 1px solid #E8D5A5;
            color: #8F6107;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: .08em;
            text-transform: uppercase;
            margin-bottom: 16px;
        }
        h1 {
            font-family: "ZSE", "Plus Jakarta Sans", sans-serif;
            font-size: clamp(22px, 4vw, 28px);
            line-height: 1.2;
            letter-spacing: -.025em;
            color: #1C1508;
            margin-bottom: 12px;
        }
        p {
            font-size: 14px;
            line-height: 1.6;
            color: #6B5D45;
            margin-bottom: 28px;
        }
        .gt-err-actions {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 12px;
        }
        .gt-btn-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: #121AFF;
            color: #FFFFFF;
            text-decoration: none;
            font-size: 13.5px;
            font-weight: 700;
            padding: 12px 22px;
            border-radius: 12px;
            box-shadow: 0 10px 24px -6px rgba(18, 26, 255, .45);
            transition: background-color .18s ease, transform .15s ease;
        }
        .gt-btn-primary:hover {
            background: #0B10C9;
            transform: translateY(-1px);
        }
        .gt-btn-secondary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: #FAF7F0;
            color: #1C1508;
            border: 1px solid #D6C9B2;
            text-decoration: none;
            font-size: 13.5px;
            font-weight: 600;
            padding: 12px 20px;
            border-radius: 12px;
            transition: border-color .18s ease, color .18s ease;
        }
        .gt-btn-secondary:hover {
            border-color: #8F6107;
            color: #8F6107;
        }
        @media (max-width: 480px) {
            .gt-err-card { padding: 30px 22px; }
            .gt-err-actions a { width: 100%; }
        }
    </style>
</head>
<body>
    <main class="gt-err-card" role="main">
        <a href="{{ url('/') }}" class="gt-err-brand" aria-label="GundjaTech">
            <img src="/img/favicon.svg" alt="" width="30" height="30">
            <span>Gundja<em>Tech</em></span>
        </a>

        <div>
            <span class="gt-err-code">Erro @yield('code')</span>
        </div>

        <h1>@yield('heading')</h1>
        <p>@yield('message')</p>

        <div class="gt-err-actions">
            @yield('actions')
        </div>
    </main>
</body>
</html>
