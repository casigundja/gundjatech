<?php

namespace App\Console\Commands;

use App\Models\AdvertisingCampaign;
use App\Models\BlogPost;
use App\Models\Client;
use App\Models\Contract;
use App\Models\Conversation;
use App\Models\Domain;
use App\Models\FinancialTransaction;
use App\Models\PortfolioProject;
use App\Models\Project;
use App\Models\Quotation;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanDemoDataCommand extends Command
{
    protected $signature = 'gundjatech:clean-demo-data {--force : Executa sem pedir confirmação interativa}';

    protected $description = 'Remove exclusivamente os registros fictícios e de teste criados pelo DatabaseSeeder, preservando o SuperAdmin, permissões RBAC, serviços e dados reais.';

    /** @var list<string> */
    private const DEMO_CLIENT_EMAILS = [
        'cliente@acmecorp.com',
        'contato@innovasolutions.com',
        'roberto@apexlog.com.br',
    ];

    /** @var list<string> */
    private const DEMO_STAFF_EMAILS = [
        'gerente@gundjatech.com',
        'atendimento@gundjatech.com',
        'dev@gundjatech.com',
        'financeiro@gundjatech.com',
    ];

    /** @var list<string> */
    private const DEMO_REQUEST_PROTOCOLS = [
        'GJT-2026-0001',
        'GJT-2026-0002',
        'GJT-2026-0003',
    ];

    /** @var list<string> */
    private const DEMO_PROJECT_CODES = [
        'PRJ-2026-0001',
    ];

    /** @var list<string> */
    private const DEMO_QUOTATION_NUMBERS = [
        'ORC-2026-0001',
    ];

    /** @var list<string> */
    private const DEMO_TRANSACTION_TITLES = [
        'Entrada 50% - E-Commerce Acme Corp',
        'Parcela Final 50% - E-Commerce Acme Corp',
        'Servidores Dedicados & Cloud Storage',
    ];

    /** @var list<string> */
    private const DEMO_DOMAINS = [
        'acmecorp.com.br',
        'innovasolutions.tech',
    ];

    /** @var list<string> */
    private const DEMO_CAMPAIGNS = [
        'Escala SaaS Q4 • Meta Ads',
    ];

    /** @var list<string> */
    private const DEMO_CONVERSATION_SUBJECTS = [
        'Dúvida sobre homologação dos Correios no E-commerce',
    ];

    /** @var list<string> */
    private const DEMO_PORTFOLIO_SLUGS = [
        'portal-corporativo-apex-logistica',
        'ecommerce-moda-acessorios-velvet',
        'escala-trafego-pago-innova-solutions',
    ];

    public function handle(): int
    {
        if (! $this->option('force') && ! $this->confirm('Deseja remover os registros fictícios do seeder mantendo o SuperAdmin, permissões, catálogo de serviços e dados reais?')) {
            $this->info('Operação cancelada.');

            return self::SUCCESS;
        }

        $removed = [];

        DB::transaction(function () use (&$removed): void {
            $demoClientIds = Client::whereIn('email', self::DEMO_CLIENT_EMAILS)->pluck('id')->all();

            $removed['conversations'] = Conversation::query()
                ->where(function ($q) use ($demoClientIds): void {
                    $q->whereIn('subject', self::DEMO_CONVERSATION_SUBJECTS);
                    if ($demoClientIds !== []) {
                        $q->orWhereIn('client_id', $demoClientIds);
                    }
                })
                ->delete();

            $removed['campaigns'] = AdvertisingCampaign::query()
                ->where(function ($q) use ($demoClientIds): void {
                    $q->whereIn('name', self::DEMO_CAMPAIGNS);
                    if ($demoClientIds !== []) {
                        $q->orWhereIn('client_id', $demoClientIds);
                    }
                })
                ->delete();

            $removed['transactions'] = FinancialTransaction::query()
                ->where(function ($q) use ($demoClientIds): void {
                    $q->whereIn('title', self::DEMO_TRANSACTION_TITLES);
                    if ($demoClientIds !== []) {
                        $q->orWhereIn('client_id', $demoClientIds);
                    }
                })
                ->delete();

            $removed['domains'] = Domain::query()
                ->where(function ($q) use ($demoClientIds): void {
                    $q->whereIn('domain_name', self::DEMO_DOMAINS);
                    if ($demoClientIds !== []) {
                        $q->orWhereIn('client_id', $demoClientIds);
                    }
                })
                ->delete();

            $removed['contracts'] = Contract::query()
                ->when($demoClientIds !== [], fn ($q) => $q->whereIn('client_id', $demoClientIds))
                ->when($demoClientIds === [], fn ($q) => $q->whereRaw('1 = 0'))
                ->delete();

            $removed['projects'] = Project::query()
                ->where(function ($q) use ($demoClientIds): void {
                    $q->whereIn('code', self::DEMO_PROJECT_CODES);
                    if ($demoClientIds !== []) {
                        $q->orWhereIn('client_id', $demoClientIds);
                    }
                })
                ->delete();

            $removed['quotations'] = Quotation::query()
                ->where(function ($q) use ($demoClientIds): void {
                    $q->whereIn('quotation_number', self::DEMO_QUOTATION_NUMBERS);
                    if ($demoClientIds !== []) {
                        $q->orWhereIn('client_id', $demoClientIds);
                    }
                })
                ->delete();

            $removed['requests'] = ServiceRequest::query()
                ->where(function ($q) use ($demoClientIds): void {
                    $q->whereIn('protocol', self::DEMO_REQUEST_PROTOCOLS)
                        ->orWhereIn('email', self::DEMO_CLIENT_EMAILS);
                    if ($demoClientIds !== []) {
                        $q->orWhereIn('client_id', $demoClientIds);
                    }
                })
                ->delete();

            $removed['clients'] = Client::whereIn('email', self::DEMO_CLIENT_EMAILS)->delete();

            $removed['portfolio'] = PortfolioProject::whereIn('slug', self::DEMO_PORTFOLIO_SLUGS)->delete();

            $demoUserIds = User::whereIn('email', array_merge(self::DEMO_CLIENT_EMAILS, self::DEMO_STAFF_EMAILS))
                ->where('role', '!=', 'superadmin')
                ->pluck('id')
                ->all();

            if ($demoUserIds !== []) {
                $superAdminId = User::where('role', 'superadmin')->value('id');
                if ($superAdminId !== null) {
                    BlogPost::whereIn('author_id', $demoUserIds)->update(['author_id' => $superAdminId]);
                }
            }

            $removed['users'] = User::whereIn('email', array_merge(self::DEMO_CLIENT_EMAILS, self::DEMO_STAFF_EMAILS))
                ->where('role', '!=', 'superadmin')
                ->delete();
        });

        $this->info('Limpeza de dados fictícios concluída com sucesso:');
        foreach ($removed as $entity => $count) {
            $this->line("  - {$entity}: {$count} removido(s)");
        }

        return self::SUCCESS;
    }
}
