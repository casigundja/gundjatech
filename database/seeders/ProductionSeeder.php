<?php

namespace Database\Seeders;

use App\Models\BlogPost;
use App\Models\PortfolioProject;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ProductionSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(PermissionSeeder::class);

        $adminEmail = (string) env('GUNDJATECH_ADMIN_EMAIL', 'admin@gundjatech.com');
        $adminPassword = (string) env('GUNDJATECH_ADMIN_PASSWORD', 'GundjaTech@2026!');

        $admin = User::firstOrCreate(
            ['email' => $adminEmail],
            [
                'name' => 'Diretoria GundjaTech',
                'password' => Hash::make($adminPassword),
                'phone' => null,
                'role' => 'superadmin',
                'is_active' => true,
            ]
        );

        $categories = [
            [
                'slug' => 'criacao-de-sites',
                'name' => 'Criação de Sites & Sistemas',
                'description' => 'Desenvolvimento de sites institucionais, lojas virtuais, landing pages e sistemas sob medida com alta performance.',
                'icon' => 'globe',
                'order' => 1,
            ],
            [
                'slug' => 'gerenciamento-de-dominios',
                'name' => 'Gerenciamento de Domínios & Cibersegurança',
                'description' => 'Registro seguro, monitoramento 24/7, firewall de aplicação, backups e gestão avançada de zonas DNS.',
                'icon' => 'shield-check',
                'order' => 2,
            ],
            [
                'slug' => 'gestao-de-trafego-pago',
                'name' => 'Operação Contínua & Tráfego Pago',
                'description' => 'Hospedagem gerenciada, operação contínua de sites e campanhas de performance em Meta Ads e Google Ads.',
                'icon' => 'trending-up',
                'order' => 3,
            ],
            [
                'slug' => 'produtos-de-informatica',
                'name' => 'Produtos & Infraestrutura de TI',
                'description' => 'Equipamentos corporativos, servidores, notebooks e estações de trabalho sob medida.',
                'icon' => 'cpu',
                'order' => 4,
            ],
        ];

        $categoryMap = [];
        foreach ($categories as $cat) {
            $categoryMap[$cat['slug']] = ServiceCategory::firstOrCreate(
                ['slug' => $cat['slug']],
                [
                    'name' => $cat['name'],
                    'description' => $cat['description'],
                    'icon' => $cat['icon'],
                    'order' => $cat['order'],
                    'is_active' => true,
                ]
            );
        }

        $services = [
            [
                'slug' => 'site-institucional-premium',
                'category' => 'criacao-de-sites',
                'name' => 'Site Institucional Premium',
                'short_description' => 'Sites sob medida de alta autoridade, rápidos, responsivos e otimizados para SEO.',
                'full_description' => 'Arquitetura web moderna sob medida com design exclusivo, SEO técnico, SSL, integração com formulários e operação de alta disponibilidade.',
                'icon' => 'layout',
                'base_price' => 3800.00,
                'billing_type' => 'one_time',
                'estimated_days' => 15,
                'is_featured' => true,
            ],
            [
                'slug' => 'loja-virtual-alta-conversao',
                'category' => 'criacao-de-sites',
                'name' => 'Loja Virtual de Alta Conversão (E-Commerce)',
                'short_description' => 'Plataformas de e-commerce escaláveis com checkout otimizado e gestão completa.',
                'full_description' => 'Desenvolvimento de lojas virtuais com meios de pagamento integrados, gestão de pedidos, frete dinâmico e painel administrativo completo.',
                'icon' => 'shopping-cart',
                'base_price' => 6500.00,
                'billing_type' => 'one_time',
                'estimated_days' => 25,
                'is_featured' => true,
            ],
            [
                'slug' => 'landing-page-alta-performance',
                'category' => 'criacao-de-sites',
                'name' => 'Landing Page de Alta Performance',
                'short_description' => 'Páginas focadas em conversão, velocidade extrema e captura qualificada de leads.',
                'full_description' => 'Design orientado a conversão, carregamento ultrarrápido e integração nativa com CRM e painel de solicitações GundjaTech.',
                'icon' => 'target',
                'base_price' => 1900.00,
                'billing_type' => 'one_time',
                'estimated_days' => 7,
                'is_featured' => true,
            ],
            [
                'slug' => 'gestao-e-registro-de-dominios',
                'category' => 'gerenciamento-de-dominios',
                'name' => 'Gestão de Domínios & Cibersegurança',
                'short_description' => 'Blindagem web, monitoramento 24/7, DNS profissional e proteção contra invasões.',
                'full_description' => 'Gestão completa de domínios, registros DNS (SPF, DKIM, DMARC), firewall de aplicação e backups preventivos.',
                'icon' => 'shield',
                'base_price' => 120.00,
                'billing_type' => 'yearly',
                'estimated_days' => 1,
                'is_featured' => false,
            ],
            [
                'slug' => 'gestao-trafego-meta-ads',
                'category' => 'gestao-de-trafego-pago',
                'name' => 'Gestão de Tráfego Meta Ads',
                'short_description' => 'Campanhas de aquisição e remarketing com foco em retorno sobre investimento.',
                'full_description' => 'Planejamento estratégico, criativos orientados a dados, API de Conversões e acompanhamento contínuo no Portal do Cliente.',
                'icon' => 'pie-chart',
                'base_price' => 1800.00,
                'billing_type' => 'monthly',
                'estimated_days' => 30,
                'is_featured' => true,
            ],
            [
                'slug' => 'gestao-trafego-google-ads',
                'category' => 'gestao-de-trafego-pago',
                'name' => 'Gestão de Tráfego Google Ads',
                'short_description' => 'Captação de clientes de alta intenção na Rede de Pesquisa e Google Shopping.',
                'full_description' => 'Estruturação de campanhas Google Ads com acompanhamento de conversões, otimização de CPA e relatórios transparentes.',
                'icon' => 'search',
                'base_price' => 2000.00,
                'billing_type' => 'monthly',
                'estimated_days' => 30,
                'is_featured' => true,
            ],
        ];

        foreach ($services as $srv) {
            Service::firstOrCreate(
                ['slug' => $srv['slug']],
                [
                    'category_id' => $categoryMap[$srv['category']]->id,
                    'name' => $srv['name'],
                    'short_description' => $srv['short_description'],
                    'full_description' => $srv['full_description'],
                    'icon' => $srv['icon'],
                    'base_price' => $srv['base_price'],
                    'billing_type' => $srv['billing_type'],
                    'estimated_days' => $srv['estimated_days'],
                    'is_featured' => $srv['is_featured'],
                    'is_active' => true,
                ]
            );
        }

        $portfolioCases = [
            [
                'slug' => 'klasse',
                'title' => 'KLASSE — Plataforma de Gestão Escolar em Angola',
                'client_name' => 'KLASSE',
                'category' => 'EdTech · Gestão Escolar',
                'description' => 'Plataforma completa de gestão escolar concebida para instituições de ensino privado em Angola, centralizando propinas, matrículas, pautas, presenças e documentos MED em tempo real.',
                'challenge' => 'Escolas lidavam com folhas de cálculo em Excel, filas na secretaria e baixa visibilidade financeira no fecho de caixa e controlo de propinas.',
                'solution' => 'Vitrine digital de produto e ecossistema web com gestão financeira, conciliação bancária assistida, documentos MED em lote, portais por perfil e dashboard executivo em tempo real.',
                'results' => 'Posicionamento de referência em tecnologia educativa em Angola e aceleração direta na geração de demonstrações e diagnósticos escolares.',
                'live_url' => 'https://klasse.ao/',
            ],
            [
                'slug' => 'instituto-paraiso-do-saber',
                'title' => 'Instituto Técnico Privado de Saúde Paraíso do Saber',
                'client_name' => 'Instituto Paraíso do Saber',
                'category' => 'Educação & Saúde',
                'description' => 'Portal institucional em Luanda para formação técnica em Enfermagem, Análises Clínicas, Farmácia, Fisioterapia e Estomatologia, com inscrições e tour virtual do campus.',
                'challenge' => 'Organizar os 5 cursos técnicos de saúde, facilitar a pesquisa e o processo de inscrições abertas e apresentar os laboratórios práticos do campus com clareza em mobile e desktop.',
                'solution' => 'Portal responsivo com catálogo e pesquisa de cursos, jornada simplificada de admissões, galeria e tour virtual do campus, notícias, eventos e área administrativa.',
                'results' => 'Presença digital moderna que reforça a credibilidade científica da instituição e reduz barreiras na captação de novos estudantes.',
                'live_url' => 'https://institutoparaisodosaber.com/',
            ],
            [
                'slug' => 'cotech-contabilidade',
                'title' => 'Cotech Contabilidade & Consultoria Empresarial',
                'client_name' => 'Cotech Contabilidade',
                'category' => 'Contabilidade & Consultoria',
                'description' => 'Plataforma corporativa de contabilidade empresarial e consultoria tributária com planos claros, abertura de empresas, 5 calculadoras fiscais interativas e área da equipa.',
                'challenge' => 'Superar o padrão genérico do setor contábil com uma presença executiva capaz de atrair e qualificar empresários através de ferramentas práticas.',
                'solution' => 'Interface corporativa de alto contraste integrada a simuladores de Custo CNPJ, PJ x CLT, Fator R, RPA online e Reforma Tributária, além de blog SEO e atendimento imediato.',
                'results' => 'Aumento da autoridade digital e conversão qualificada de visitantes em oportunidades de contabilidade empresarial.',
                'live_url' => 'https://cotechcontabilidade.com/',
            ],
        ];

        foreach ($portfolioCases as $case) {
            PortfolioProject::firstOrCreate(
                ['slug' => $case['slug']],
                [
                    'title' => $case['title'],
                    'client_name' => $case['client_name'],
                    'category' => $case['category'],
                    'description' => $case['description'],
                    'challenge' => $case['challenge'],
                    'solution' => $case['solution'],
                    'results' => $case['results'],
                    'live_url' => $case['live_url'],
                    'is_featured' => true,
                    'is_published' => true,
                ]
            );
        }

        $articles = [
            [
                'slug' => 'velocidade-site-sucesso-trafego-pago',
                'title' => 'Por que a velocidade do seu site define o sucesso das suas campanhas de tráfego pago',
                'excerpt' => 'Cada segundo extra de carregamento pode custar até 20% das suas conversões. Entenda como a infraestrutura técnica impacta seu ROI.',
                'content' => 'Muitos empresários investem em anúncios no Meta Ads e Google Ads, mas esquecem que o anúncio é apenas a metade da jornada. Quando o usuário clica no anúncio e a página demora mais de 3 segundos para carregar, grande parte dos visitantes desiste antes mesmo de ver a oferta.',
                'category' => 'Tráfego Pago & Performance',
                'tags' => ['Tráfego Pago', 'Performance', 'Velocidade', 'Vendas Online'],
            ],
            [
                'slug' => 'dominio-proprio-emails-profissionais-blindagem',
                'title' => 'Domínio Próprio e E-mails Profissionais: A Blindagem que Sua Marca Precisa',
                'excerpt' => 'Usar e-mails gratuitos ou deixar seu domínio desprotegido pode comprometer a autoridade do seu negócio. Veja como proteger sua marca.',
                'content' => 'Ter um domínio próprio registrado e configurado com as diretrizes internacionais de segurança (SPF, DKIM e DMARC) garante que seus orçamentos e propostas cheguem na caixa de entrada dos seus clientes e protege a reputação da sua empresa.',
                'category' => 'Domínios & Cibersegurança',
                'tags' => ['Domínios', 'DNS', 'E-mail Corporativo', 'Segurança'],
            ],
        ];

        foreach ($articles as $article) {
            BlogPost::firstOrCreate(
                ['slug' => $article['slug']],
                [
                    'author_id' => $admin->id,
                    'title' => $article['title'],
                    'excerpt' => $article['excerpt'],
                    'content' => $article['content'],
                    'category' => $article['category'],
                    'tags' => $article['tags'],
                    'is_published' => true,
                    'published_at' => now(),
                ]
            );
        }

        SystemSetting::set('company_name', 'GundjaTech');
        SystemSetting::set('company_slogan', 'Engenharia digital, criação de sites, cibersegurança e operação contínua.');
        SystemSetting::set('company_email', 'contato@gundjatech.com');
        SystemSetting::set('company_phone', '(19) 95324-8420');
        SystemSetting::set('company_whatsapp', '5519953248420');
        SystemSetting::set('company_cnpj', '');
        SystemSetting::set('primary_color', '#F2C230');
        SystemSetting::set('secondary_color', '#16749A');
        SystemSetting::set('dark_color', '#063B5C');
    }
}
