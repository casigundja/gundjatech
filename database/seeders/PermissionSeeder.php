<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Permission;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $definitions = [
            ['slug' => 'admin.dashboard.view', 'name' => 'Visualizar Dashboard Admin', 'module' => 'dashboard', 'description' => 'Acesso aos indicadores executivos do painel administrativo'],
            ['slug' => 'clients.view', 'name' => 'Visualizar Clientes', 'module' => 'clients', 'description' => 'Listagem e ficha cadastral de clientes'],
            ['slug' => 'clients.manage', 'name' => 'Gerenciar Clientes', 'module' => 'clients', 'description' => 'Criar, editar e remover clientes'],
            ['slug' => 'requests.view', 'name' => 'Visualizar Solicitações', 'module' => 'requests', 'description' => 'Acompanhar protocolos e solicitações recebidas'],
            ['slug' => 'requests.manage', 'name' => 'Gerenciar Solicitações', 'module' => 'requests', 'description' => 'Alterar status, atribuir responsáveis e converter em projetos'],
            ['slug' => 'quotations.view', 'name' => 'Visualizar Orçamentos', 'module' => 'quotations', 'description' => 'Visualizar propostas comerciais emitidas'],
            ['slug' => 'quotations.manage', 'name' => 'Gerenciar Orçamentos', 'module' => 'quotations', 'description' => 'Criar e editar orçamentos e itens'],
            ['slug' => 'projects.view', 'name' => 'Visualizar Projetos', 'module' => 'projects', 'description' => 'Visualizar cronograma, etapas e entregas de projetos'],
            ['slug' => 'projects.manage', 'name' => 'Gerenciar Projetos', 'module' => 'projects', 'description' => 'Criar projetos, atualizar progresso, etapas e anexos'],
            ['slug' => 'services.view', 'name' => 'Visualizar Serviços', 'module' => 'services', 'description' => 'Consultar catálogo de serviços e categorias'],
            ['slug' => 'services.manage', 'name' => 'Gerenciar Serviços', 'module' => 'services', 'description' => 'Cadastrar e editar serviços no catálogo'],
            ['slug' => 'domains.view', 'name' => 'Visualizar Domínios', 'module' => 'domains', 'description' => 'Consultar domínios, zonas DNS e vencimentos'],
            ['slug' => 'domains.manage', 'name' => 'Gerenciar Domínios', 'module' => 'domains', 'description' => 'Cadastrar domínios, registros DNS e renovações'],
            ['slug' => 'campaigns.view', 'name' => 'Visualizar Campanhas', 'module' => 'campaigns', 'description' => 'Consultar métricas e relatórios de tráfego pago'],
            ['slug' => 'campaigns.manage', 'name' => 'Gerenciar Campanhas', 'module' => 'campaigns', 'description' => 'Criar campanhas e lançar métricas de performance'],
            ['slug' => 'finance.view', 'name' => 'Visualizar Financeiro', 'module' => 'finance', 'description' => 'Visualizar receitas, despesas e fluxo de caixa'],
            ['slug' => 'finance.manage', 'name' => 'Gerenciar Financeiro', 'module' => 'finance', 'description' => 'Lançar cobranças, confirmar pagamentos e emitir faturas'],
            ['slug' => 'chat.view', 'name' => 'Visualizar Atendimentos', 'module' => 'chat', 'description' => 'Visualizar conversas e chamados de clientes'],
            ['slug' => 'chat.manage', 'name' => 'Responder Atendimentos', 'module' => 'chat', 'description' => 'Enviar mensagens e encerrar atendimentos'],
            ['slug' => 'users.view', 'name' => 'Visualizar Usuários', 'module' => 'users', 'description' => 'Consultar equipe interna e perfis de acesso'],
            ['slug' => 'users.manage', 'name' => 'Gerenciar Usuários', 'module' => 'users', 'description' => 'Criar contas de equipe, editar cargos e ativar/desativar acessos'],
            ['slug' => 'settings.manage', 'name' => 'Gerenciar Configurações', 'module' => 'settings', 'description' => 'Alterar parâmetros globais da plataforma'],
            ['slug' => 'portal.access', 'name' => 'Acessar Portal do Cliente', 'module' => 'portal', 'description' => 'Acesso autenticado à área exclusiva do cliente'],
            ['slug' => 'portal.requests.manage', 'name' => 'Criar Solicitações no Portal', 'module' => 'portal', 'description' => 'Abrir e acompanhar solicitações próprias'],
            ['slug' => 'portal.projects.view', 'name' => 'Acompanhar Projetos no Portal', 'module' => 'portal', 'description' => 'Visualizar andamento e arquivos dos próprios projetos'],
            ['slug' => 'portal.quotations.approve', 'name' => 'Aprovar Orçamentos no Portal', 'module' => 'portal', 'description' => 'Aprovar ou recusar propostas comerciais recebidas'],
            ['slug' => 'portal.domains.view', 'name' => 'Visualizar Domínios no Portal', 'module' => 'portal', 'description' => 'Consultar domínios e solicitar renovações'],
            ['slug' => 'portal.campaigns.view', 'name' => 'Visualizar Campanhas no Portal', 'module' => 'portal', 'description' => 'Consultar métricas das campanhas de tráfego pago'],
            ['slug' => 'portal.finance.view', 'name' => 'Visualizar Financeiro no Portal', 'module' => 'portal', 'description' => 'Visualizar faturas e histórico de pagamentos'],
            ['slug' => 'portal.chat.manage', 'name' => 'Atendimento no Portal', 'module' => 'portal', 'description' => 'Abrir conversas e trocar mensagens com a equipe'],
        ];

        $permissionRows = array_map(fn (array $def): array => [
            'slug' => $def['slug'],
            'name' => $def['name'],
            'module' => $def['module'],
            'description' => $def['description'],
            'created_at' => $now,
            'updated_at' => $now,
        ], $definitions);

        Permission::upsert($permissionRows, ['slug'], ['name', 'module', 'description', 'updated_at']);

        $permissionMap = Permission::pluck('id', 'slug')->all();

        $roleRows = [];
        foreach (UserRole::cases() as $role) {
            $slugs = $role === UserRole::SuperAdmin
                ? array_keys($permissionMap)
                : $role->defaultPermissions();

            foreach ($slugs as $slug) {
                if (! isset($permissionMap[$slug])) {
                    continue;
                }

                $roleRows[] = [
                    'role' => $role->value,
                    'permission_id' => $permissionMap[$slug],
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        DB::table('role_permissions')->upsert($roleRows, ['role', 'permission_id'], ['updated_at']);
        User::clearRolePermissionCache();
    }
}
