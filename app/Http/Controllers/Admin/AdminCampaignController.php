<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\AdvertisingCampaign;
use App\Models\CampaignMetric;
use App\Models\Client;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class AdminCampaignController extends Controller
{
    public function index(Request $request): View
    {
        $query = AdvertisingCampaign::with('client')
            ->withSum('metrics', 'spend')
            ->withSum('metrics', 'clicks')
            ->withSum('metrics', 'conversions');

        if ($request->filled('platform')) {
            $query->where('platform', $request->platform);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $campaigns = $query->orderBy('created_at', 'desc')->paginate(10)->withQueryString();
        $clients = Client::where('status', 'active')->orderBy('company_name')->get();

        return view('admin.campaigns.index', compact('campaigns', 'clients'));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'client_id' => ['required', 'exists:clients,id'],
            'name' => ['required', 'string', 'max:255'],
            'platform' => ['required', 'in:google_ads,meta_ads,tiktok_ads,linkedin_ads'],
            'budget' => ['required', 'numeric', 'min:0'],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'target_audience' => ['nullable', 'string'],
            'objective' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        $campaign = AdvertisingCampaign::create(array_merge($validated, [
            'status' => 'active',
            'spent' => 0,
        ]));

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'campaign.created',
            'subject_type' => AdvertisingCampaign::class,
            'subject_id' => $campaign->id,
            'details' => ['name' => $campaign->name, 'platform' => $campaign->platform],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->route('admin.campaigns.show', $campaign)->with('success', 'Campanha de tráfego iniciada!');
    }

    public function show(AdvertisingCampaign $campaign): View
    {
        $campaign->load(['client', 'metrics' => function ($q): void {
            $q->orderBy('date', 'desc');
        }]);

        return view('admin.campaigns.show', compact('campaign'));
    }

    public function updateStatus(Request $request, AdvertisingCampaign $campaign): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:draft,active,paused,ended'],
        ]);

        $campaign->update(['status' => $validated['status']]);

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'campaign.status_updated',
            'subject_type' => AdvertisingCampaign::class,
            'subject_id' => $campaign->id,
            'details' => ['name' => $campaign->name, 'status' => $campaign->status],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', 'Status da campanha atualizado com sucesso!');
    }

    public function addMetrics(Request $request, AdvertisingCampaign $campaign): RedirectResponse
    {
        if (! $request->filled('date') && $request->filled('metric_date')) {
            $request->merge(['date' => $request->input('metric_date')]);
        }

        $validated = $request->validate([
            'date' => ['required', 'date'],
            'impressions' => ['required', 'integer', 'min:0'],
            'clicks' => ['required', 'integer', 'min:0'],
            'conversions' => ['required', 'integer', 'min:0'],
            'spend' => ['required', 'numeric', 'min:0'],
            'conversion_value' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        $spend = (float) $validated['spend'];
        $clicks = (int) $validated['clicks'];
        $conversions = (int) $validated['conversions'];
        $conversionValue = (float) ($validated['conversion_value'] ?? 0);

        $cpc = $clicks > 0 ? round($spend / $clicks, 2) : 0.0;
        $cpa = $conversions > 0 ? round($spend / $conversions, 2) : 0.0;
        $roas = $spend > 0 && $conversionValue > 0 ? round($conversionValue / $spend, 2) : 0.0;

        CampaignMetric::updateOrCreate(
            ['campaign_id' => $campaign->id, 'date' => $validated['date']],
            [
                'impressions' => (int) $validated['impressions'],
                'clicks' => $clicks,
                'conversions' => $conversions,
                'spend' => $spend,
                'cpc' => $cpc,
                'cpa' => $cpa,
                'roas' => $roas,
                'notes' => $validated['notes'] ?? null,
            ]
        );

        $campaign->update([
            'spent' => (float) $campaign->metrics()->sum('spend'),
        ]);

        return back()->with('success', 'Métricas de desempenho registradas!');
    }

    public function destroy(Request $request, AdvertisingCampaign $campaign): RedirectResponse
    {
        $campaignId = $campaign->id;
        $name = $campaign->name;

        DB::transaction(function () use ($campaign): void {
            $campaign->delete();
        });

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'campaign.deleted',
            'subject_type' => AdvertisingCampaign::class,
            'subject_id' => $campaignId,
            'details' => ['name' => $name],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->route('admin.campaigns.index')
            ->with('success', "Campanha {$name} excluída com sucesso.");
    }
}
