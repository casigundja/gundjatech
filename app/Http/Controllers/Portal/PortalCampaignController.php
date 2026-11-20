<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\AdvertisingCampaign;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class PortalCampaignController extends Controller
{
    public function index(): View
    {
        $client = Auth::user()->client;
        $campaigns = AdvertisingCampaign::where('client_id', $client ? $client->id : 0)
            ->with(['metrics' => function ($q): void {
                $q->orderBy('date', 'desc');
            }])
            ->orderBy('created_at', 'desc')
            ->get();

        return view('portal.campaigns.index', compact('campaigns'));
    }
}
