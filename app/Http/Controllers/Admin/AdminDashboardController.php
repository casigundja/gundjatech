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
use App\Models\ServiceRequest;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class AdminDashboardController extends Controller
{
    public function index(): View
    {
        $now = Carbon::now();
        $sixMonthsStart = $now->copy()->subMonths(5)->startOfMonth();

        $clientStats = Client::query()
            ->selectRaw("COUNT(*) as total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active")
            ->first();
        $totalClients = (int) ($clientStats->total ?? 0);
        $activeClients = (int) ($clientStats->active ?? 0);

        $requestStats = ServiceRequest::query()
            ->selectRaw("COUNT(*) as total, SUM(CASE WHEN status IN ('new', 'analyzing', 'awaiting_info') THEN 1 ELSE 0 END) as pending")
            ->first();
        $totalRequests = (int) ($requestStats->total ?? 0);
        $pendingRequests = (int) ($requestStats->pending ?? 0);

        $quotationStats = Quotation::query()
            ->whereIn('status', ['draft', 'sent'])
            ->selectRaw('COUNT(*) as open_count, COALESCE(SUM(total), 0) as open_value')
            ->first();
        $openQuotations = (int) ($quotationStats->open_count ?? 0);
        $openQuotationsValue = (float) ($quotationStats->open_value ?? 0);

        $projectStats = Project::query()
            ->selectRaw("SUM(CASE WHEN status IN ('planning', 'in_progress', 'reviewing') THEN 1 ELSE 0 END) as active, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed")
            ->first();
        $activeProjects = (int) ($projectStats->active ?? 0);
        $completedProjects = (int) ($projectStats->completed ?? 0);

        $activeCampaigns = AdvertisingCampaign::where('status', 'active')->count();
        $openConversations = Conversation::where('status', '!=', 'closed')->count();

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

        // Single query for monthly revenue, pending receivables, and 6-month revenue chart
        $sixMonthsStartDate = $sixMonthsStart->toDateString();
        $incomeTransactions = FinancialTransaction::query()
            ->where('type', 'income')
            ->where(function ($q) use ($sixMonthsStartDate): void {
                $q->whereIn('status', ['pending', 'overdue'])
                    ->orWhere(function ($paidQuery) use ($sixMonthsStartDate): void {
                        $paidQuery->where('status', 'paid')
                            ->where(function ($dateQuery) use ($sixMonthsStartDate): void {
                                $dateQuery->where('paid_date', '>=', $sixMonthsStartDate)
                                    ->orWhere(function ($fallback) use ($sixMonthsStartDate): void {
                                        $fallback->whereNull('paid_date')
                                            ->where('due_date', '>=', $sixMonthsStartDate);
                                    });
                            });
                    });
            })
            ->get(['status', 'amount', 'paid_date', 'due_date']);

        $currentYm = $now->format('Y-m');
        $monthlyRevenue = 0.0;
        $pendingReceivables = 0.0;
        $incomeByMonth = [];

        foreach ($incomeTransactions as $tx) {
            if (in_array($tx->status, ['pending', 'overdue'], true)) {
                $pendingReceivables += (float) $tx->amount;

                continue;
            }

            if ($tx->status === 'paid') {
                $effectiveDate = $tx->paid_date ?? $tx->due_date;
                if ($effectiveDate !== null) {
                    $ym = Carbon::parse($effectiveDate)->format('Y-m');
                    $incomeByMonth[$ym] = ($incomeByMonth[$ym] ?? 0.0) + (float) $tx->amount;
                    if ($ym === $currentYm) {
                        $monthlyRevenue += (float) $tx->amount;
                    }
                }
            }
        }

        // Single query for 6-month requests chart
        $recentRequestDates = ServiceRequest::query()
            ->where('created_at', '>=', $sixMonthsStart)
            ->pluck('created_at');

        $requestsByMonth = [];
        foreach ($recentRequestDates as $createdAt) {
            if ($createdAt !== null) {
                $ym = Carbon::parse($createdAt)->format('Y-m');
                $requestsByMonth[$ym] = ($requestsByMonth[$ym] ?? 0) + 1;
            }
        }

        $months = [];
        $requestsData = [];
        $incomeData = [];

        for ($i = 5; $i >= 0; $i--) {
            $date = $now->copy()->subMonths($i);
            $ym = $date->format('Y-m');
            $months[] = ucfirst($date->translatedFormat('M/Y'));
            $requestsData[] = $requestsByMonth[$ym] ?? 0;
            $incomeData[] = (float) ($incomeByMonth[$ym] ?? 0.0);
        }

        $recentRequests = ServiceRequest::with(['service', 'client'])
            ->orderBy('created_at', 'desc')
            ->take(6)
            ->get();

        $recentProjects = Project::with(['client', 'manager'])
            ->orderBy('updated_at', 'desc')
            ->take(5)
            ->get();

        $recentActivities = ActivityLog::with('user')
            ->latest()
            ->take(6)
            ->get();

        // Chart 2: Services by Category
        $servicesBreakdown = DB::table('service_requests')
            ->join('services', 'service_requests.service_id', '=', 'services.id')
            ->join('service_categories', 'services.category_id', '=', 'service_categories.id')
            ->select('service_categories.name', DB::raw('count(*) as total'))
            ->groupBy('service_categories.name')
            ->get();

        return view('admin.dashboard', compact(
            'totalClients',
            'activeClients',
            'totalRequests',
            'pendingRequests',
            'openQuotations',
            'openQuotationsValue',
            'activeProjects',
            'completedProjects',
            'activeCampaigns',
            'openConversations',
            'domainsExpiringSoon',
            'domainsExpiringSoonList',
            'monthlyRevenue',
            'pendingReceivables',
            'recentRequests',
            'recentProjects',
            'recentActivities',
            'months',
            'requestsData',
            'incomeData',
            'servicesBreakdown'
        ));
    }
}
