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
                radial-gradient(60% 55% at 22% 24%, rgba(242, 194, 48, .20), transparent 65%),
                radial-gradient(50% 50% at 85% 80%, rgba(22, 116, 154, .32), transparent 65%),
                #063B5C;
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
            color: #063B5C;
            border-radius: 24px;
            padding: 40px 36px;
            box-shadow: 0 32px 80px -20px rgba(4, 24, 38, .65), 0 0 0 1px rgba(242, 194, 48, .28);
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
            font-weight: 800;
            color: #063B5C;
            letter-spacing: -.03em;
        }
        .gt-err-brand span em {
            font-style: normal;
            color: #F2C230;
        }
        .gt-err-code {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 14px;
            border-radius: 999px;
            background: #FEF7DC;
            border: 1px solid rgba(242, 194, 48, .65);
            color: #9A6B00;
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
            color: #063B5C;
            margin-bottom: 12px;
        }
        p {
            font-size: 14px;
            line-height: 1.6;
            color: #46667B;
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
            background: #F2C230;
            color: #063B5C;
            text-decoration: none;
            font-size: 13.5px;
            font-weight: 800;
            padding: 12px 22px;
            border-radius: 12px;
            box-shadow: 0 10px 24px -6px rgba(242, 194, 48, .50);
            transition: background-color .18s ease, transform .15s ease;
        }
        .gt-btn-primary:hover {
            background: #E0B020;
            transform: translateY(-1px);
        }
        .gt-btn-secondary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: #E7F0F5;
            color: #063B5C;
            border: 1px solid #B6CDD9;
            text-decoration: none;
            font-size: 13.5px;
            font-weight: 700;
            padding: 12px 20px;
            border-radius: 12px;
            transition: border-color .18s ease, color .18s ease, background-color .18s ease;
        }
        .gt-btn-secondary:hover {
            background: #DCE8F0;
            border-color: #16749A;
            color: #16749A;
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
