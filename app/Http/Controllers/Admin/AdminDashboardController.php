<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\AdvertisingCampaign;
use App\Models\Client;
use App\Models\Conversation;
use App\Models\Domain;
use App\Models\FinancialTransaction;
use App\Models\Project;
use App\Models\Quotation;
use App\Models\ServiceCategory;
use App\Models\ServiceRequest;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminDashboardController extends Controller
{
    public function index(Request $request): View
    {
        $now = Carbon::now();
        $allowedPeriods = [7, 30, 90, 365];
        $periodDays = (int) $request->query('period', 30);
        if (! in_array($periodDays, $allowedPeriods, true)) {
            $periodDays = 30;
        }

        $periodStart = $now->copy()->subDays($periodDays)->startOfDay();
        $prevPeriodStart = $periodStart->copy()->subDays($periodDays);
        $twelveMonthsStart = $now->copy()->subMonths(11)->startOfMonth();

        // Clients KPI
        $clientStats = Client::query()
            ->selectRaw("COUNT(*) as total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active, SUM(CASE WHEN status = 'lead' THEN 1 ELSE 0 END) as leads")
            ->first();
        $totalClients = (int) ($clientStats->total ?? 0);
        $activeClients = (int) ($clientStats->active ?? 0);
        $leadClients = (int) ($clientStats->leads ?? 0);

        $newClientsCurrent = Client::where('created_at', '>=', $periodStart)->count();
        $newClientsPrevious = Client::whereBetween('created_at', [$prevPeriodStart, $periodStart])->count();
        $clientsGrowthPct = $this->calculateGrowth($newClientsCurrent, $newClientsPrevious);

        // Service Requests KPI
        $requestStats = ServiceRequest::query()
            ->selectRaw("COUNT(*) as total, SUM(CASE WHEN status IN ('new', 'analyzing', 'awaiting_info') THEN 1 ELSE 0 END) as pending")
            ->first();
        $totalRequests = (int) ($requestStats->total ?? 0);
        $pendingRequests = (int) ($requestStats->pending ?? 0);

        $requestsCurrentPeriod = ServiceRequest::where('created_at', '>=', $periodStart)->count();
        $requestsPreviousPeriod = ServiceRequest::whereBetween('created_at', [$prevPeriodStart, $periodStart])->count();
        $requestsGrowthPct = $this->calculateGrowth($requestsCurrentPeriod, $requestsPreviousPeriod);

        // Quotations KPI
        $quotationStats = Quotation::query()
            ->whereIn('status', ['draft', 'sent'])
            ->selectRaw('COUNT(*) as open_count, COALESCE(SUM(total), 0) as open_value')
            ->first();
        $openQuotations = (int) ($quotationStats->open_count ?? 0);
        $openQuotationsValue = (float) ($quotationStats->open_value ?? 0);

        // Projects KPI
        $projectStats = Project::query()
            ->selectRaw("SUM(CASE WHEN status IN ('planning', 'in_progress', 'reviewing') THEN 1 ELSE 0 END) as active, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed")
            ->first();
        $activeProjects = (int) ($projectStats->active ?? 0);
        $completedProjects = (int) ($projectStats->completed ?? 0);

        // Campaigns & Conversations KPI
        $activeCampaigns = AdvertisingCampaign::where('status', 'active')->count();
        $openConversations = Conversation::where('status', '!=', 'closed')->count();
        $waitingStaffConversations = Conversation::where('status', 'waiting_staff')->count();

        // Expiring Domains
        $expiringThreshold = $now->copy()->addDays(30);
        $domainsExpiringSoonList = Domain::with('client')
            ->whereIn('status', ['active', 'expiring_soon'])
            ->where('expiration_date', '<=', $expiringThreshold)
            ->orderBy('expiration_date', 'asc')
            ->take(5)
            ->get();

        $domainsExpiringSoon = Domain::whereIn('status', ['active', 'expiring_soon'])
            ->where('expiration_date', '<=', $expiringThreshold)
            ->count();

        // Financial transactions (last 12 months + pending/overdue)
        $twelveMonthsStartDate = $twelveMonthsStart->toDateString();
        $incomeTransactions = FinancialTransaction::query()
            ->where('type', 'income')
            ->where(function ($q) use ($twelveMonthsStartDate): void {
                $q->whereIn('status', ['pending', 'overdue'])
                    ->orWhere(function ($paidQuery) use ($twelveMonthsStartDate): void {
                        $paidQuery->where('status', 'paid')
                            ->where(function ($dateQuery) use ($twelveMonthsStartDate): void {
                                $dateQuery->where('paid_date', '>=', $twelveMonthsStartDate)
                                    ->orWhere(function ($fallback) use ($twelveMonthsStartDate): void {
                                        $fallback->whereNull('paid_date')
                                            ->where('due_date', '>=', $twelveMonthsStartDate);
                                    });
                            });
                    });
            })
            ->get(['status', 'amount', 'paid_date', 'due_date']);

        $monthlyRevenue = 0.0;
        $prevPeriodRevenue = 0.0;
        $currentMonthRevenue = 0.0;
        $currentMonthPending = 0.0;
        $pendingReceivables = 0.0;
        $paidByMonth = [];
        $pendingByMonth = [];
        $currentYm = $now->format('Y-m');

        foreach ($incomeTransactions as $tx) {
            $amount = (float) $tx->amount;

            if (in_array($tx->status, ['pending', 'overdue'], true)) {
                $pendingReceivables += $amount;
                if ($tx->due_date !== null) {
                    $ym = Carbon::parse($tx->due_date)->format('Y-m');
                    $pendingByMonth[$ym] = ($pendingByMonth[$ym] ?? 0.0) + $amount;
                    if ($ym === $currentYm) {
                        $currentMonthPending += $amount;
                    }
                }

                continue;
            }

            if ($tx->status === 'paid') {
                $effectiveDate = $tx->paid_date ?? $tx->due_date;
                if ($effectiveDate !== null) {
                    $parsedDate = Carbon::parse($effectiveDate);
                    $ym = $parsedDate->format('Y-m');
                    $paidByMonth[$ym] = ($paidByMonth[$ym] ?? 0.0) + $amount;

                    if ($ym === $currentYm) {
                        $currentMonthRevenue += $amount;
                    }
                    if ($parsedDate->greaterThanOrEqualTo($periodStart)) {
                        $monthlyRevenue += $amount;
                    } elseif ($parsedDate->greaterThanOrEqualTo($prevPeriodStart) && $parsedDate->lessThan($periodStart)) {
                        $prevPeriodRevenue += $amount;
                    }
                }
            }
        }

        $revenueGrowthPct = $this->calculateGrowth($monthlyRevenue, $prevPeriodRevenue);

        // 12-month series (Receita Paga vs A Receber) + 6-month legacy arrays
        $chart12Series = [];
        $chartMaxValue = 0.0;
        $months = [];
        $incomeData = [];
        $requestsData = [];

        $recentRequestTimestamps = ServiceRequest::query()
            ->where('created_at', '>=', $twelveMonthsStart)
            ->pluck('created_at');

        $requestsByMonth = [];
        foreach ($recentRequestTimestamps as $createdAt) {
            if ($createdAt !== null) {
                $ym = Carbon::parse($createdAt)->format('Y-m');
                $requestsByMonth[$ym] = ($requestsByMonth[$ym] ?? 0) + 1;
            }
        }

        for ($i = 11; $i >= 0; $i--) {
            $date = $now->copy()->subMonths($i);
            $ym = $date->format('Y-m');
            $paidVal = (float) ($paidByMonth[$ym] ?? 0.0);
            $pendVal = (float) ($pendingByMonth[$ym] ?? 0.0);
            $reqCount = (int) ($requestsByMonth[$ym] ?? 0);

            $chartMaxValue = max($chartMaxValue, $paidVal, $pendVal);
            $chart12Series[] = [
                'ym' => $ym,
                'label' => ucfirst($date->translatedFormat('M')),
                'full_label' => ucfirst($date->translatedFormat('F Y')),
                'paid' => $paidVal,
                'pending' => $pendVal,
                'requests' => $reqCount,
                'is_current' => $ym === $currentYm,
            ];

            if ($i <= 5) {
                $months[] = ucfirst($date->translatedFormat('M/Y'));
                $incomeData[] = $paidVal;
                $requestsData[] = $reqCount;
            }
        }

        $scaleTop = $chartMaxValue > 0 ? $chartMaxValue : 1.0;
        foreach ($chart12Series as &$slot) {
            $slot['paid_pct'] = $slot['paid'] > 0 ? max(8, (int) round(($slot['paid'] / $scaleTop) * 92)) : 0;
            $slot['pending_pct'] = $slot['pending'] > 0 ? max(8, (int) round(($slot['pending'] / $scaleTop) * 92)) : 0;
        }
        unset($slot);

        $yAxisTicks = $this->buildAxisTicks($chartMaxValue);
        $currentMonthLabel = ucfirst($now->translatedFormat('F Y'));
        $currentMonthRequests = (int) ($requestsByMonth[$currentYm] ?? 0);

        // Real Category Rings (up to 4 service categories)
        $servicesBreakdown = DB::table('service_requests')
            ->join('services', 'service_requests.service_id', '=', 'services.id')
            ->join('service_categories', 'services.category_id', '=', 'service_categories.id')
            ->select('service_categories.id', 'service_categories.name', DB::raw('count(*) as total'))
            ->groupBy('service_categories.id', 'service_categories.name')
            ->get();

        $breakdownMap = [];
        foreach ($servicesBreakdown as $row) {
            $breakdownMap[(int) $row->id] = (int) $row->total;
        }

        $ringPalette = [
            ['radius' => 80, 'circumference' => 502.65, 'color' => '#F2C230'],
            ['radius' => 65, 'circumference' => 408.41, 'color' => '#121AFF'],
            ['radius' => 50, 'circumference' => 314.16, 'color' => '#16749A'],
            ['radius' => 35, 'circumference' => 219.91, 'color' => '#FFE074'],
        ];

        $categories = ServiceCategory::where('is_active', true)->orderBy('order')->take(4)->get();
        $categoryRings = [];
        $totalCategorizedRequests = array_sum($breakdownMap);

        foreach ($categories->values() as $idx => $category) {
            $count = $breakdownMap[$category->id] ?? 0;
            $pct = $totalCategorizedRequests > 0 ? (int) round(($count / $totalCategorizedRequests) * 100) : 0;
            $ringMeta = $ringPalette[$idx] ?? $ringPalette[3];
            $dash = round(($ringMeta['circumference'] * $pct) / 100, 1);

            $shortLabel = explode('&', $category->name)[0];
            $shortLabel = trim(str_replace(['Criação de ', 'Gerenciamento de ', 'Gestão de ', 'Operação Contínua'], ['', '', '', 'Operação'], $shortLabel));

            $categoryRings[] = [
                'name' => $category->name,
                'short_name' => $shortLabel !== '' ? $shortLabel : $category->name,
                'count' => $count,
                'pct' => $pct,
                'radius' => $ringMeta['radius'],
                'circumference' => round($ringMeta['circumference'], 1),
                'dash' => $dash,
                'color' => $ringMeta['color'],
            ];
        }

        // Real Client Distribution by Location / Region (zero fake countries)
        $allClients = Client::query()->get(['city', 'state', 'status']);
        $locationCounts = [];
        foreach ($allClients as $client) {
            $state = trim((string) ($client->state ?? ''));
            $city = trim((string) ($client->city ?? ''));
            $label = $state !== '' && $city !== ''
                ? "{$city} ({$state})"
                : ($state !== '' ? $state : ($city !== '' ? $city : 'Localidade não informada'));

            $locationCounts[$label] = ($locationCounts[$label] ?? 0) + 1;
        }
        arsort($locationCounts);

        $barGradients = [
            'linear-gradient(90deg, #F2C230 0%, #FFE074 100%)',
            'linear-gradient(90deg, #1E2BFF 0%, #6E7BFF 100%)',
            'linear-gradient(90deg, #16749A 0%, #38BDF8 100%)',
            'linear-gradient(90deg, #F2C230 0%, #E4A318 48%, #3B49FF 100%)',
        ];
        $clientsByLocation = [];
        $locIdx = 0;
        foreach (array_slice($locationCounts, 0, 4, true) as $locLabel => $locCount) {
            $pct = $totalClients > 0 ? round(($locCount / $totalClients) * 100, 1) : 0.0;
            $clientsByLocation[] = [
                'label' => $locLabel,
                'count' => $locCount,
                'pct' => $pct,
                'gradient' => $barGradients[$locIdx % count($barGradients)],
            ];
            $locIdx++;
        }

        // Real 5x7 Hourly Demands Heatmap (from actual ServiceRequest created_at in period)
        $heatmapBuckets = [
            '08h–11h' => [0, 0, 0, 0, 0, 0, 0],
            '11h–14h' => [0, 0, 0, 0, 0, 0, 0],
            '14h–17h' => [0, 0, 0, 0, 0, 0, 0],
            '17h–20h' => [0, 0, 0, 0, 0, 0, 0],
            '20h–08h' => [0, 0, 0, 0, 0, 0, 0],
        ];

        $periodRequestTimes = ServiceRequest::query()
            ->where('created_at', '>=', $periodStart)
            ->pluck('created_at');

        $heatmapMax = 0;
        foreach ($periodRequestTimes as $ts) {
            if ($ts === null) {
                continue;
            }
            $dt = Carbon::parse($ts);
            $dow = $dt->dayOfWeek; // 0 = Sun ... 6 = Sat
            $hour = $dt->hour;

            $slotKey = match (true) {
                $hour >= 8 && $hour < 11 => '08h–11h',
                $hour >= 11 && $hour < 14 => '11h–14h',
                $hour >= 14 && $hour < 17 => '14h–17h',
                $hour >= 17 && $hour < 20 => '17h–20h',
                default => '20h–08h',
            };

            $heatmapBuckets[$slotKey][$dow]++;
            if ($heatmapBuckets[$slotKey][$dow] > $heatmapMax) {
                $heatmapMax = $heatmapBuckets[$slotKey][$dow];
            }
        }

        $heatmapRows = [];
        foreach ($heatmapBuckets as $label => $days) {
            $cells = [];
            foreach ($days as $val) {
                $level = 0;
                if ($val > 0 && $heatmapMax > 0) {
                    $ratio = $val / $heatmapMax;
                    $level = match (true) {
                        $ratio >= 0.8 => 4,
                        $ratio >= 0.55 => 3,
                        $ratio >= 0.25 => 2,
                        default => 1,
                    };
                }
                $cells[] = [
                    'v' => $val,
                    'c' => 'gtb-heat-'.$level,
                ];
            }
            $heatmapRows[$label] = $cells;
        }

        // Live Operational Feeds
        $recentRequests = ServiceRequest::with(['service', 'client'])
            ->orderBy('created_at', 'desc')
            ->take(6)
            ->get();

        $recentConversations = Conversation::with(['client', 'latestMessage'])
            ->orderBy('updated_at', 'desc')
            ->take(5)
            ->get();

        $recentProjects = Project::with(['client', 'manager'])
            ->orderBy('updated_at', 'desc')
            ->take(5)
            ->get();

        $recentActivities = ActivityLog::with('user')
            ->latest()
            ->take(6)
            ->get();

        return view('admin.dashboard', compact(
            'periodDays',
            'periodStart',
            'totalClients',
            'activeClients',
            'leadClients',
            'newClientsCurrent',
            'clientsGrowthPct',
            'totalRequests',
            'pendingRequests',
            'requestsCurrentPeriod',
            'requestsGrowthPct',
            'openQuotations',
            'openQuotationsValue',
            'activeProjects',
            'completedProjects',
            'activeCampaigns',
            'openConversations',
            'waitingStaffConversations',
            'domainsExpiringSoon',
            'domainsExpiringSoonList',
            'monthlyRevenue',
            'revenueGrowthPct',
            'currentMonthRevenue',
            'currentMonthPending',
            'currentMonthLabel',
            'currentMonthRequests',
            'pendingReceivables',
            'chart12Series',
            'chartMaxValue',
            'yAxisTicks',
            'categoryRings',
            'clientsByLocation',
            'heatmapRows',
            'recentRequests',
            'recentConversations',
            'recentProjects',
            'recentActivities',
            'months',
            'requestsData',
            'incomeData',
            'servicesBreakdown'
        ));
    }

    public function exportReport(Request $request): StreamedResponse
    {
        $allowedPeriods = [7, 30, 90, 365];
        $periodDays = (int) $request->query('period', 30);
        if (! in_array($periodDays, $allowedPeriods, true)) {
            $periodDays = 30;
        }

        $periodStart = Carbon::now()->subDays($periodDays)->startOfDay();
        $fileName = 'relatorio-gundjatech-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($periodDays, $periodStart): void {
            $handle = fopen('php://output', 'w');
            if ($handle === false) {
                return;
            }

            // UTF-8 BOM for Excel compatibility
            fwrite($handle, "\xEF\xBB\xBF");

            fputcsv($handle, ['Relatorio Executivo GundjaTech', 'Periodo: Ultimos '.$periodDays.' dias', 'Gerado em: '.now()->format('d/m/Y H:i')], ';');
            fputcsv($handle, [], ';');

            fputcsv($handle, ['RESUMO OPERACIONAL'], ';');
            fputcsv($handle, ['Indicador', 'Valor'], ';');
            fputcsv($handle, ['Total de Clientes', (string) Client::count()], ';');
            fputcsv($handle, ['Clientes Ativos', (string) Client::where('status', 'active')->count()], ';');
            fputcsv($handle, ['Total de Solicitacoes', (string) ServiceRequest::count()], ';');
            fputcsv($handle, ['Solicitacoes no Periodo', (string) ServiceRequest::where('created_at', '>=', $periodStart)->count()], ';');
            fputcsv($handle, ['Conversas Abertas (Chat)', (string) Conversation::where('status', '!=', 'closed')->count()], ';');
            fputcsv($handle, ['Projetos Ativos', (string) Project::whereIn('status', ['planning', 'in_progress', 'reviewing'])->count()], ';');
            fputcsv($handle, ['Orcamentos em Aberto (R$)', number_format((float) Quotation::whereIn('status', ['draft', 'sent'])->sum('total'), 2, ',', '.')], ';');
            fputcsv($handle, ['Receita Recebida Total (R$)', number_format((float) FinancialTransaction::where('type', 'income')->where('status', 'paid')->sum('amount'), 2, ',', '.')], ';');
            fputcsv($handle, [], ';');

            fputcsv($handle, ['SOLICITACOES RECEBIDAS NO PERIODO'], ';');
            fputcsv($handle, ['Protocolo', 'Nome', 'E-mail', 'Telefone', 'Empresa', 'Assunto', 'Status', 'Data'], ';');

            ServiceRequest::where('created_at', '>=', $periodStart)
                ->orderByDesc('created_at')
                ->chunk(200, function ($requests) use ($handle): void {
                    foreach ($requests as $req) {
                        fputcsv($handle, [
                            $req->protocol,
                            $req->name,
                            $req->email,
                            $req->phone ?? '',
                            $req->company ?? '',
                            $req->service_title ?? '',
                            $req->status_label,
                            $req->created_at?->format('d/m/Y H:i') ?? '',
                        ], ';');
                    }
                });

            fclose($handle);
        }, $fileName, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function calculateGrowth(float|int $current, float|int $previous): ?float
    {
        if ($previous <= 0) {
            return null;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    /**
     * @return list<string>
     */
    private function buildAxisTicks(float $maxVal): array
    {
        if ($maxVal <= 0) {
            return ['R$ 0', '—', '—', '—', '0'];
        }

        $formatTick = static function (float $val): string {
            if ($val >= 1000) {
                return number_format($val / 1000, $val >= 10000 ? 0 : 1, ',', '.').'k';
            }

            return number_format($val, 0, ',', '.');
        };

        return [
            $formatTick($maxVal),
            $formatTick($maxVal * 0.75),
            $formatTick($maxVal * 0.50),
            $formatTick($maxVal * 0.25),
            '0',
        ];
    }
}
