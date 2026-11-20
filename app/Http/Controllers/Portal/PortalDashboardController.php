<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\AdvertisingCampaign;
use App\Models\Domain;
use App\Models\Project;
use App\Models\Quotation;
use App\Models\ServiceRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class PortalDashboardController extends Controller
{
    public function index(): View
    {
        $user = Auth::user();
        $client = $user->ensureClientProfile();

        $clientId = $client ? $client->id : 0;

        $pendingRequests = ServiceRequest::where('client_id', $clientId)
            ->whereIn('status', ['new', 'analyzing', 'awaiting_info', 'quotation_sent', 'awaiting_approval'])
            ->count();

        $activeProjects = Project::where('client_id', $clientId)
            ->whereIn('status', ['planning', 'in_progress', 'reviewing'])
            ->count();

        $totalDomains = Domain::where('client_id', $clientId)->count();

        $activeCampaigns = AdvertisingCampaign::where('client_id', $clientId)
            ->where('status', 'active')
            ->count();

        $quotationsPending = Quotation::where('client_id', $clientId)
            ->where('status', 'sent')
            ->get();

        $recentProjects = Project::where('client_id', $clientId)
            ->with(['stages', 'service', 'manager'])
            ->orderBy('updated_at', 'desc')
            ->take(3)
            ->get();

        $recentRequests = ServiceRequest::where('client_id', $clientId)
            ->with('service')
            ->orderBy('created_at', 'desc')
            ->take(4)
            ->get();

        return view('portal.dashboard', compact(
            'client',
            'pendingRequests',
            'activeProjects',
            'totalDomains',
            'activeCampaigns',
            'quotationsPending',
            'recentProjects',
            'recentRequests'
        ));
    }
}
