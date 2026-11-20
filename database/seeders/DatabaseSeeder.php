<?php

namespace Database\Seeders;

use App\Models\AdvertisingCampaign;
use App\Models\BlogPost;
use App\Models\CampaignMetric;
use App\Models\Client;
use App\Models\Contract;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Models\DnsRecord;
use App\Models\Domain;
use App\Models\FinancialTransaction;
use App\Models\Payment;
use App\Models\PortfolioProject;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\ProjectStage;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\RequestStatusHistory;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\ServiceRequest;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(PermissionSeeder::class);

        // 1. Users
        $admin = User::create([
            'name' => 'Diretoria GundjaTech',
            'email' => 'admin@gundjatech.com',
            'password' => Hash::make('password'),
            'phone' => '(11) 99876-5432',
            'role' => 'superadmin',
            'is_active' => true,
        ]);

        $manager = User::create([
            'name' => 'Lucas Ferreira (Gerente)',
            'email' => 'gerente@gundjatech.com',
            'password' => Hash::make('password'),
            'phone' => '(11) 98765-4321',
            'role' => 'manager',
            'is_active' => true,
        ]);

        $attendant = User::create([
            'name' => 'Beatriz Lima (Atendimento)',
            'email' => 'atendimento@gundjatech.com',
            'password' => Hash::make('password'),
            'phone' => '(11) 97654-3210',
            'role' => 'attendant',
            'is_active' => true,
        ]);

        $dev = User::create([
            'name' => 'Rodrigo Souza (Desenvolvedor)',
            'email' => 'dev@gundjatech.com',
            'password' => Hash::make('password'),
            'phone' => '(11) 96543-2109',
            'role' => 'developer',
            'is_active' => true,
        ]);

        $financial = User::create([
            'name' => 'Camila Martins (Financeiro)',
            'email' => 'financeiro@gundjatech.com',
            'password' => Hash::make('password'),
            'phone' => '(11) 95432-1098',
            'role' => 'financial',
            'is_active' => true,
        ]);

        // Client Users
        $clientUser1 = User::create([
            'name' => 'Carlos Silva',
            'email' => 'cliente@acmecorp.com',
            'password' => Hash::make('password'),
            'phone' => '(11) 94321-0987',
            'role' => 'client',
            'is_active' => true,
        ]);

        $clientUser2 = User::create([
            'name' => 'Mariana Rocha',
            'email' => 'contato@innovasolutions.com',
            'password' => Hash::make('password'),
            'phone' => '(11) 93210-9876',
            'role' => 'client',
            'is_active' => true,
        ]);

        // 2. Clients
        $client1 = Client::create([
            'user_id' => $clientUser1->id,
            'name' => 'Carlos Silva',
            'company_name' => 'Acme Corporation Brasil Ltda',
            'email' => 'cliente@acmecorp.com',
            'phone' => '(11) 3210-4567',
            'document' => '12.345.678/0001-90',
            'address' => 'Av. Paulista, 1578, 12º andar',
            'city' => 'São Paulo',
            'state' => 'SP',
            'postal_code' => '01310-200',
            'notes' => 'Cliente prioritário - Contrato anual de desenvolvimento e tráfego pago.',
            'status' => 'active',
        ]);

        $client2 = Client::create([
            'user_id' => $clientUser2->id,
            'name' => 'Mariana Rocha',
            'company_name' => 'Innova Solutions Tech',
            'email' => 'contato@innovasolutions.com',
            'phone' => '(11) 3456-7890',
            'document' => '98.765.432/0001-10',
            'address' => 'Rua Funchal, 418',
            'city' => 'São Paulo',
            'state' => 'SP',
            'postal_code' => '04551-060',
            'notes' => 'Foco em gestão de tráfego Google Ads e renovação de domínios.',
            'status' => 'active',
        ]);

        $client3 = Client::create([
            'name' => 'Roberto Mendes',
            'company_name' => 'Apex Logística Integrada',
            'email' => 'roberto@apexlog.com.br',
            'phone' => '(19) 99887-6655',
            'document' => '45.123.789/0001-55',
            'city' => 'Campinas',
            'state' => 'SP',
            'status' => 'active',
        ]);

        // 3. Service Categories
        $catWeb = ServiceCategory::create([
            'name' => 'Criação de Sites & Sistemas',
            'slug' => 'criacao-de-sites',
            'description' => 'Desenvolvimento de sites institucionais, lojas virtuais, landing pages e sistemas sob medida com máxima velocidade e arquitetura moderna.',
            'icon' => 'globe',
            'order' => 1,
            'is_active' => true,
        ]);

        $catDomain = ServiceCategory::create([
            'name' => 'Gerenciamento de Domínios & DNS',
            'slug' => 'gerenciamento-de-dominios',
            'description' => 'Registro seguro, renovação automática, monitoramento de vencimento, e-mails profissionais e gestão avançada de zonas DNS.',
            'icon' => 'shield-check',
            'order' => 2,
            'is_active' => true,
        ]);

        $catTraffic = ServiceCategory::create([
            'name' => 'Gestão de Tráfego Pago & Performance',
            'slug' => 'gestao-de-trafego-pago',
            'description' => 'Campanhas aceleradoras em Meta Ads, Google Ads e TikTok com foco estrito em conversão, redução de CPA e aumento de faturamento.',
            'icon' => 'trending-up',
            'order' => 3,
            'is_active' => true,
        ]);

        $catHardware = ServiceCategory::create([
            'name' => 'Produtos & Infraestrutura de TI',
            'slug' => 'produtos-de-informatica',
            'description' => 'Venda de equipamentos corporativos, notebooks, servidores, componentes de hardware e estações de trabalho de alto desempenho.',
            'icon' => 'cpu',
            'order' => 4,
            'is_active' => true,
        ]);

        // 4. Services
        $srvSiteInst = Service::create([
            'category_id' => $catWeb->id,
            'name' => 'Site Institucional Premium',
            'slug' => 'site-institucional-premium',
            'short_description' => 'Sites de alta autoridade projetados para posicionar marcas líderes, com carregamento instantâneo e layout exclusivo.',
            'full_description' => 'Criamos sites institucionais que combinam design moderno, responsividade absoluta e código otimizado para o Google. Inclui painel administrativo intuitivo, certificado SSL, integração com WhatsApp e formulários de alta conversão.',
            'icon' => 'layout',
            'base_price' => 3800.00,
            'billing_type' => 'one_time',
            'estimated_days' => 15,
            'features' => ['Layout 100% exclusivo', 'Painel de gerenciamento', 'Otimização SEO On-Page', 'Carregamento em menos de 1s', 'Integração WhatsApp e Analytics'],
            'is_featured' => true,
            'is_active' => true,
        ]);

        $srvEcommerce = Service::create([
            'category_id' => $catWeb->id,
            'name' => 'Loja Virtual de Alta Conversão (E-Commerce)',
            'slug' => 'loja-virtual-alta-conversao',
            'short_description' => 'Plataformas de e-commerce robustas com checkout transparente, cálculo automático de frete e gestão de estoque.',
            'full_description' => 'Desenvolvemos lojas virtuais focadas em vendas. Checkout fluido em uma única etapa, integração com Mercado Pago, Pagar.me, Correios e transportadoras, além de painel de controle de pedidos, cupons e relatórios financeiros.',
            'icon' => 'shopping-cart',
            'base_price' => 6500.00,
            'billing_type' => 'one_time',
            'estimated_days' => 25,
            'features' => ['Checkout transparente em 1 passo', 'Integração com PIX e Cartão', 'Cálculo dinâmico de frete', 'Recuperação de carrinho abandonado', 'Painel financeiro integrado'],
            'is_featured' => true,
            'is_active' => true,
        ]);

        $srvLanding = Service::create([
            'category_id' => $catWeb->id,
            'name' => 'Landing Page de Alta Performance',
            'slug' => 'landing-page-alta-performance',
            'short_description' => 'Páginas de vendas cirúrgicas desenhadas especificamente para receber tráfego pago e converter visitantes em clientes.',
            'full_description' => 'Uma landing page não pode apenas ser bonita — ela precisa vender. Aplicamos neuromarketing, gatilhos mentais, copy persuasiva e testes A/B estruturados para garantir a menor taxa de rejeição e o maior retorno sobre investimento.',
            'icon' => 'target',
            'base_price' => 1900.00,
            'billing_type' => 'one_time',
            'estimated_days' => 7,
            'features' => ['Copywriting persuasivo incluso', 'Taxa de conversão superior a 15%', 'Carregamento ultrarrápido (Score 95+ PageSpeed)', 'Integração direta com CRM e WhatsApp'],
            'is_featured' => true,
            'is_active' => true,
        ]);

        $srvDomains = Service::create([
            'category_id' => $catDomain->id,
            'name' => 'Gestão e Registro de Domínios',
            'slug' => 'gestao-e-registro-de-dominios',
            'short_description' => 'Registro, blindagem, renovação preventiva e apontamento DNS profissional para garantir que sua empresa nunca fique fora do ar.',
            'full_description' => 'Gerenciamos seu patrimônio digital. Monitoramos as datas de expiração com alertas preventivos, configuramos registros DNS (SPF, DKIM, DMARC para que seus e-mails não caiam no spam) e garantimos renovações seguras.',
            'icon' => 'shield',
            'base_price' => 120.00,
            'billing_type' => 'yearly',
            'estimated_days' => 1,
            'features' => ['Monitoramento 24/7 de vencimento', 'Configuração SPF, DKIM e DMARC', 'Redirecionamento de DNS sem downtime', 'Suporte técnico humanizado'],
            'is_featured' => false,
            'is_active' => true,
        ]);

        $srvMetaAds = Service::create([
            'category_id' => $catTraffic->id,
            'name' => 'Gestão de Tráfego Meta Ads (Instagram & Facebook)',
            'slug' => 'gestao-trafego-meta-ads',
            'short_description' => 'Campanhas com criativos de alto impacto para impactar o público certo no momento exato de compra.',
            'full_description' => 'Planejamento, criação e otimização diária de anúncios patrocinados no Instagram e Facebook. Segmentação avançada por interesses, públicos personalizados (Lookalike, Remarketing) e relatórios executivos semanais.',
            'icon' => 'pie-chart',
            'base_price' => 1800.00,
            'billing_type' => 'monthly',
            'estimated_days' => 30,
            'features' => ['Estratégia de funil de vendas', 'Criação e testes de criativos', 'Otimização diária de orçamento', 'Pixel e API de Conversões configurados', 'Relatórios semanais com ROAS real'],
            'is_featured' => true,
            'is_active' => true,
        ]);

        $srvGoogleAds = Service::create([
            'category_id' => $catTraffic->id,
            'name' => 'Gestão de Tráfego Google Ads (Rede de Pesquisa & Shopping)',
            'slug' => 'gestao-trafego-google-ads',
            'short_description' => 'Posicione sua empresa no topo do Google quando potenciais clientes estiverem procurando exatamente pelo que você vende.',
            'full_description' => 'Captamos clientes com intenção imediata de compra através da Rede de Pesquisa do Google, Google Shopping e Performance Max. Otimização cirúrgica de palavras-chave negativas para não desperdiçar nenhum centavo.',
            'icon' => 'search',
            'base_price' => 2000.00,
            'billing_type' => 'monthly',
            'estimated_days' => 30,
            'features' => ['Palavras-chave de fundo de funil', 'Configuração Google Tag Manager', 'Campanhas de Google Shopping', 'Otimização de índice de qualidade'],
            'is_featured' => true,
            'is_active' => true,
        ]);

        // 5. Service Requests
        $req1 = ServiceRequest::create([
            'protocol' => 'GJT-2026-0001',
            'client_id' => $client1->id,
            'user_id' => $clientUser1->id,
            'service_id' => $srvEcommerce->id,
            'name' => 'Carlos Silva',
            'company' => 'Acme Corporation',
            'email' => 'cliente@acmecorp.com',
            'phone' => '(11) 94321-0987',
            'service_title' => 'Nova Loja Virtual de Equipamentos e Peças',
            'description' => 'Precisamos de um e-commerce moderno para venda de periféricos corporativos e equipamentos, com checkout transparente, cálculo automático de frete e painel administrativo.',
            'estimated_budget' => 7500.00,
            'desired_deadline' => now()->addDays(30),
            'status' => 'approved',
            'internal_notes' => 'Proposta aprovada pelo cliente. Projeto criado e em desenvolvimento.',
            'assigned_user_id' => $manager->id,
        ]);

        RequestStatusHistory::create([
            'service_request_id' => $req1->id,
            'user_id' => $manager->id,
            'old_status' => 'new',
            'new_status' => 'approved',
            'comment' => 'Solicitação aprovada e convertida no Projeto PRJ-2026-0001.',
        ]);

        $req2 = ServiceRequest::create([
            'protocol' => 'GJT-2026-0002',
            'client_id' => $client2->id,
            'user_id' => $clientUser2->id,
            'service_id' => $srvMetaAds->id,
            'name' => 'Mariana Rocha',
            'company' => 'Innova Solutions Tech',
            'email' => 'contato@innovasolutions.com',
            'phone' => '(11) 93210-9876',
            'service_title' => 'Campanha de Tráfego Pago para Software B2B',
            'description' => 'Queremos acelerar as vendas do nosso SaaS corporativo utilizando Meta Ads e Google Ads com orçamento mensal de R$ 5.000 em mídia.',
            'estimated_budget' => 2500.00,
            'desired_deadline' => now()->addDays(15),
            'status' => 'in_progress',
            'internal_notes' => 'Campanhas no ar e otimizadas diariamente.',
            'assigned_user_id' => $manager->id,
        ]);

        $req3 = ServiceRequest::create([
            'protocol' => 'GJT-2026-0003',
            'client_id' => $client3->id,
            'name' => 'Roberto Mendes',
            'company' => 'Apex Logística Integrada',
            'email' => 'roberto@apexlog.com.br',
            'phone' => '(19) 99887-6655',
            'service_title' => 'Redesenho Completo de Portal Institucional',
            'description' => 'Nosso site atual tem mais de 6 anos e não é responsivo. Queremos um site moderno no estilo Sinnapse com formulário de cotação de fretes.',
            'estimated_budget' => 4500.00,
            'desired_deadline' => now()->addDays(20),
            'status' => 'quotation_sent',
            'internal_notes' => 'Orçamento ORC-2026-0002 enviado para avaliação da diretoria da Apex.',
            'assigned_user_id' => $attendant->id,
        ]);

        // 6. Quotations
        $quotation1 = Quotation::create([
            'quotation_number' => 'ORC-2026-0001',
            'service_request_id' => $req1->id,
            'client_id' => $client1->id,
            'user_id' => $manager->id,
            'title' => 'Desenvolvimento de E-Commerce Corporativo de Alta Performance',
            'subtotal' => 7000.00,
            'discount' => 500.00,
            'total' => 6500.00,
            'status' => 'approved',
            'valid_until' => now()->addDays(15),
            'notes' => 'Condições de pagamento: 50% de entrada + 50% na homologação final.',
            'approved_at' => now()->subDays(5),
        ]);

        QuotationItem::create([
            'quotation_id' => $quotation1->id,
            'service_id' => $srvEcommerce->id,
            'description' => 'Desenvolvimento de Loja Virtual sob medida com checkout transparente',
            'quantity' => 1,
            'unit_price' => 6000.00,
            'total_price' => 6000.00,
        ]);

        QuotationItem::create([
            'quotation_id' => $quotation1->id,
            'service_id' => $srvDomains->id,
            'description' => 'Configuração de Servidor Cloud com SSL e E-mails Profissionais',
            'quantity' => 1,
            'unit_price' => 1000.00,
            'total_price' => 1000.00,
        ]);

        // 7. Projects
        $proj1 = Project::create([
            'code' => 'PRJ-2026-0001',
            'client_id' => $client1->id,
            'service_id' => $srvEcommerce->id,
            'quotation_id' => $quotation1->id,
            'service_request_id' => $req1->id,
            'manager_id' => $manager->id,
            'name' => 'E-Commerce Corporativo Acme Corp',
            'description' => 'Desenvolvimento da nova plataforma de vendas da Acme Corporation com catálogo de hardware e integração logística.',
            'status' => 'in_progress',
            'progress_percentage' => 65,
            'start_date' => now()->subDays(10),
            'deadline' => now()->addDays(15),
            'budget' => 6500.00,
        ]);

        ProjectStage::create([
            'project_id' => $proj1->id,
            'title' => 'Wireframe e Arquitetura UX/UI',
            'description' => 'Desenho das telas, navegação e aprovação do layout com a equipe do cliente.',
            'order' => 1,
            'status' => 'completed',
            'deadline' => now()->subDays(5),
            'completed_at' => now()->subDays(6),
        ]);

        ProjectStage::create([
            'project_id' => $proj1->id,
            'title' => 'Desenvolvimento Frontend & Backend',
            'description' => 'Implementação no stack Laravel + Livewire + Tailwind com banco de dados MySQL.',
            'order' => 2,
            'status' => 'in_progress',
            'deadline' => now()->addDays(5),
        ]);

        ProjectStage::create([
            'project_id' => $proj1->id,
            'title' => 'Integração de Pagamento e Frete',
            'description' => 'Configuração de gateway PIX/Cartão e APIs dos Correios e transportadoras.',
            'order' => 3,
            'status' => 'pending',
            'deadline' => now()->addDays(10),
        ]);

        ProjectStage::create([
            'project_id' => $proj1->id,
            'title' => 'Testes, Homologação e Go-Live',
            'description' => 'Testes de segurança, performance, treinamento do cliente e publicação final.',
            'order' => 4,
            'status' => 'pending',
            'deadline' => now()->addDays(15),
        ]);

        ProjectMember::create([
            'project_id' => $proj1->id,
            'user_id' => $manager->id,
            'role_in_project' => 'Gerente de Projeto',
        ]);

        ProjectMember::create([
            'project_id' => $proj1->id,
            'user_id' => $dev->id,
            'role_in_project' => 'Desenvolvedor Líder',
        ]);

        // 8. Contracts
        Contract::create([
            'contract_number' => 'CTR-2026-0001',
            'client_id' => $client1->id,
            'project_id' => $proj1->id,
            'quotation_id' => $quotation1->id,
            'title' => 'Contrato de Prestação de Serviços Digitais e Desenvolvimento Web',
            'content' => 'Pelo presente instrumento particular, a GundjaTech Solutions compromete-se a desenvolver a plataforma web conforme escopo aprovado no orçamento ORC-2026-0001...',
            'total_value' => 6500.00,
            'start_date' => now()->subDays(10),
            'end_date' => now()->addMonths(12),
            'status' => 'active',
            'signed_at' => now()->subDays(9),
        ]);

        // 9. Domains
        $dom1 = Domain::create([
            'client_id' => $client1->id,
            'domain_name' => 'acmecorp.com.br',
            'registrar' => 'Registro.br',
            'registration_date' => now()->subYears(2),
            'expiration_date' => now()->addMonths(8),
            'renewal_price' => 40.00,
            'status' => 'active',
            'auto_renew' => true,
            'nameservers' => "ns1.gundjatech.com\nns2.gundjatech.com",
            'notes' => 'Domínio principal da Acme Corporation.',
        ]);

        $dom2 = Domain::create([
            'client_id' => $client2->id,
            'domain_name' => 'innovasolutions.tech',
            'registrar' => 'Namecheap',
            'registration_date' => now()->subMonths(11),
            'expiration_date' => now()->addDays(14), // Expiring soon!
            'renewal_price' => 120.00,
            'status' => 'expiring_soon',
            'auto_renew' => false,
            'nameservers' => "ns1.gundjatech.com\nns2.gundjatech.com",
            'notes' => 'Alerta emitido: expira em menos de 15 dias.',
        ]);

        // DNS Records
        DnsRecord::create(['domain_id' => $dom1->id, 'type' => 'A', 'host' => '@', 'value' => '172.67.182.201', 'ttl' => 3600]);
        DnsRecord::create(['domain_id' => $dom1->id, 'type' => 'CNAME', 'host' => 'www', 'value' => 'acmecorp.com.br', 'ttl' => 3600]);
        DnsRecord::create(['domain_id' => $dom1->id, 'type' => 'MX', 'host' => '@', 'value' => 'mail.acmecorp.com.br', 'ttl' => 3600, 'priority' => 10]);
        DnsRecord::create(['domain_id' => $dom1->id, 'type' => 'TXT', 'host' => '@', 'value' => 'v=spf1 include:_spf.gundjatech.com ~all', 'ttl' => 3600]);

        // 10. Advertising Campaigns
        $camp1 = AdvertisingCampaign::create([
            'client_id' => $client2->id,
            'name' => 'Escala SaaS Q4 • Meta Ads',
            'platform' => 'meta_ads',
            'status' => 'active',
            'budget' => 5000.00,
            'spent' => 2450.00,
            'start_date' => now()->subDays(15),
            'end_date' => now()->addDays(15),
            'target_audience' => 'Empresas B2B, Gestores de TI, 25-55 anos em todo o Brasil',
            'objective' => 'Geração de Leads Qualificados',
            'notes' => 'Criativos com vídeo demonstrativo gerando CPA 35% abaixo do mercado.',
        ]);

        CampaignMetric::create([
            'campaign_id' => $camp1->id,
            'date' => now()->subDays(1),
            'impressions' => 14250,
            'clicks' => 482,
            'conversions' => 38,
            'spend' => 165.00,
            'cpc' => 0.34,
            'cpa' => 4.34,
            'roas' => 5.2,
        ]);

        CampaignMetric::create([
            'campaign_id' => $camp1->id,
            'date' => now()->subDays(2),
            'impressions' => 12800,
            'clicks' => 415,
            'conversions' => 31,
            'spend' => 150.00,
            'cpc' => 0.36,
            'cpa' => 4.83,
            'roas' => 4.9,
        ]);

        // 11. Financial Transactions & Payments
        $tx1 = FinancialTransaction::create([
            'client_id' => $client1->id,
            'project_id' => $proj1->id,
            'type' => 'income',
            'category' => 'Desenvolvimento Web',
            'title' => 'Entrada 50% - E-Commerce Acme Corp',
            'description' => 'Primeira parcela referente ao projeto PRJ-2026-0001.',
            'amount' => 3250.00,
            'due_date' => now()->subDays(8),
            'paid_date' => now()->subDays(8),
            'status' => 'paid',
            'payment_method' => 'PIX',
        ]);

        Payment::create([
            'financial_transaction_id' => $tx1->id,
            'client_id' => $client1->id,
            'amount' => 3250.00,
            'payment_method' => 'pix',
            'status' => 'approved',
            'transaction_id' => 'PIX-GJT-98234710',
            'paid_at' => now()->subDays(8),
        ]);

        $tx2 = FinancialTransaction::create([
            'client_id' => $client1->id,
            'project_id' => $proj1->id,
            'type' => 'income',
            'category' => 'Desenvolvimento Web',
            'title' => 'Parcela Final 50% - E-Commerce Acme Corp',
            'description' => 'Segunda parcela na homologação do projeto.',
            'amount' => 3250.00,
            'due_date' => now()->addDays(15),
            'status' => 'pending',
            'payment_method' => 'Boleto Bancário',
        ]);

        FinancialTransaction::create([
            'type' => 'expense',
            'category' => 'Infraestrutura Cloud',
            'title' => 'Servidores Dedicados & Cloud Storage',
            'description' => 'Hospedagem e armazenamento de alta velocidade.',
            'amount' => 680.00,
            'due_date' => now()->subDays(2),
            'paid_date' => now()->subDays(2),
            'status' => 'paid',
            'payment_method' => 'Cartão Corporativo',
        ]);

        // 12. Chat & Conversations
        $conv1 = Conversation::create([
            'client_id' => $client1->id,
            'user_id' => $attendant->id,
            'subject' => 'Dúvida sobre homologação dos Correios no E-commerce',
            'channel' => 'web_chat',
            'status' => 'open',
        ]);

        ConversationMessage::create([
            'conversation_id' => $conv1->id,
            'sender_id' => $clientUser1->id,
            'sender_type' => 'client',
            'message' => 'Olá equipe GundjaTech! Já emitimos nosso contrato com os Correios. Como fazemos para integrar o código de postagem reversa?',
            'is_read' => true,
            'read_at' => now()->subHours(2),
        ]);

        ConversationMessage::create([
            'conversation_id' => $conv1->id,
            'sender_id' => $attendant->id,
            'sender_type' => 'staff',
            'message' => 'Olá Carlos! Excelente notícia. Basta nos enviar a chave de acesso do Sigep Web pelo formulário seguro ou anexar aqui mesmo que nosso desenvolvedor configura hoje mesmo!',
            'is_read' => true,
            'read_at' => now()->subHour(1),
        ]);

        // 13. Portfolio Projects (Real GundjaTech cases)
        PortfolioProject::create([
            'title' => 'KLASSE — Plataforma de Gestão Escolar em Angola',
            'slug' => 'klasse',
            'client_name' => 'KLASSE',
            'category' => 'EdTech · Gestão Escolar',
            'description' => 'Plataforma completa de gestão escolar concebida para instituições de ensino privado em Angola, centralizando propinas, matrículas, pautas, presenças e documentos MED em tempo real.',
            'challenge' => 'Escolas lidavam com folhas de cálculo em Excel, filas na secretaria e baixa visibilidade financeira no fecho de caixa e controlo de propinas.',
            'solution' => 'Vitrine digital de produto e ecossistema web com gestão financeira, conciliação bancária assistida, documentos MED em lote, portais por perfil e dashboard executivo em tempo real.',
            'results' => 'Posicionamento de referência em tecnologia educativa em Angola e aceleração direta na geração de demonstrações e diagnósticos escolares.',
            'live_url' => 'https://klasse.ao/',
            'is_featured' => true,
            'is_published' => true,
        ]);

        PortfolioProject::create([
            'title' => 'Instituto Técnico Privado de Saúde Paraíso do Saber',
            'slug' => 'instituto-paraiso-do-saber',
            'client_name' => 'Instituto Paraíso do Saber',
            'category' => 'Educação & Saúde',
            'description' => 'Portal institucional em Luanda para formação técnica em Enfermagem, Análises Clínicas, Farmácia, Fisioterapia e Estomatologia, com inscrições e tour virtual do campus.',
            'challenge' => 'Organizar os 5 cursos técnicos de saúde, facilitar a pesquisa e o processo de inscrições abertas e apresentar os laboratórios práticos do campus com clareza em mobile e desktop.',
            'solution' => 'Portal responsivo com catálogo e pesquisa de cursos, jornada simplificada de admissões, galeria e tour virtual do campus, notícias, eventos e área administrativa.',
            'results' => 'Presença digital moderna que reforça a credibilidade científica da instituição e reduz barreiras na captação de novos estudantes.',
            'live_url' => 'https://institutoparaisodosaber.com/',
            'is_featured' => true,
            'is_published' => true,
        ]);

        PortfolioProject::create([
            'title' => 'Cotech Contabilidade & Consultoria Empresarial',
            'slug' => 'cotech-contabilidade',
            'client_name' => 'Cotech Contabilidade',
            'category' => 'Contabilidade & Consultoria',
            'description' => 'Plataforma corporativa de contabilidade empresarial e consultoria tributária com planos claros, abertura de empresas, 5 calculadoras fiscais interativas e área da equipa.',
            'challenge' => 'Superar o padrão genérico do setor contábil com uma presença executiva capaz de atrair e qualificar empresários através de ferramentas práticas.',
            'solution' => 'Interface corporativa de alto contraste integrada a simuladores de Custo CNPJ, PJ x CLT, Fator R, RPA online e Reforma Tributária, além de blog SEO e atendimento imediato.',
            'results' => 'Aumento da autoridade digital e conversão qualificada de visitantes em oportunidades de contabilidade empresarial.',
            'live_url' => 'https://cotechcontabilidade.com/',
            'is_featured' => true,
            'is_published' => true,
        ]);

        // 14. Blog Posts
        BlogPost::create([
            'author_id' => $admin->id,
            'title' => 'Por que a velocidade do seu site define o sucesso das suas campanhas de tráfego pago',
            'slug' => 'velocidade-site-sucesso-trafego-pago',
            'excerpt' => 'Cada segundo extra de carregamento pode custar até 20% das suas conversões. Entenda como a infraestrutura técnica impacta seu ROI.',
            'content' => 'Muitos empresários investem milhares de reais em anúncios no Meta Ads e Google Ads, mas esquecem que o anúncio é apenas a metade da jornada. Quando o usuário clica no anúncio e a página demora mais de 3 segundos para carregar, mais de 50% dos visitantes desistem antes mesmo de ver a oferta...',
            'category' => 'Tráfego Pago & Performance',
            'tags' => ['Tráfego Pago', 'Performance', 'Velocidade', 'Vendas Online'],
            'is_published' => true,
            'published_at' => now()->subDays(3),
        ]);

        BlogPost::create([
            'author_id' => $dev->id,
            'title' => 'Domínio Próprio e E-mails Profissionais: A Blindagem que Sua Marca Precisa',
            'slug' => 'dominio-proprio-emails-profissionais-blindagem',
            'excerpt' => 'Usar e-mails gratuitos ou deixar seu domínio desprotegido pode destruir a autoridade do seu negócio. Veja como proteger sua marca.',
            'content' => 'Ter um domínio próprio registrado e configurado com as diretrizes internacionais de segurança (SPF, DKIM e DMARC) não é apenas uma questão de imagem corporativa; é o que garante que seus orçamentos e propostas cheguem na caixa de entrada dos seus clientes em vez da caixa de spam...',
            'category' => 'Domínios & Cibersegurança',
            'tags' => ['Domínios', 'DNS', 'E-mail Corporativo', 'Segurança'],
            'is_published' => true,
            'published_at' => now()->subDays(7),
        ]);

        // 15. System Settings
        SystemSetting::set('company_name', 'GundjaTech Solutions');
        SystemSetting::set('company_slogan', 'Transformamos ideias em soluções digitais.');
        SystemSetting::set('company_email', 'contato@gundjatech.com');
        SystemSetting::set('company_phone', '(19) 95324-8420');
        SystemSetting::set('company_whatsapp', '5519953248420');
        SystemSetting::set('company_address', 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP');
        SystemSetting::set('company_cnpj', '48.912.345/0001-88');
        SystemSetting::set('primary_color', '#FFA525');
        SystemSetting::set('secondary_color', '#DD8F20');
        SystemSetting::set('dark_color', '#0B0B0B');
    }
}
