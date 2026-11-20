<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Domain;
use App\Models\RequestStatusHistory;
use App\Models\Service;
use App\Models\ServiceRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\View\View;

class PortalDomainController extends Controller
{
    public function index(): View
    {
        $client = Auth::user()->client;
        $domains = Domain::where('client_id', $client ? $client->id : 0)
            ->with(['dnsRecords', 'renewals'])
            ->orderBy('expiration_date', 'asc')
            ->get();

        return view('portal.domains.index', compact('domains'));
    }

    public function requestRenewal(Request $request, Domain $domain): RedirectResponse
    {
        Gate::authorize('view', $domain);

        $expectedTitle = "Renovação de Domínio: {$domain->domain_name}";
        $existingOpen = ServiceRequest::where('client_id', $domain->client_id)
            ->where('service_title', $expectedTitle)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->first();

        if ($existingOpen !== null) {
            return back()->with('success', "Já existe uma solicitação de renovação aberta para {$domain->domain_name} (Protocolo {$existingOpen->protocol}).");
        }

        $protocol = 'REN-'.date('Ymd').'-'.strtoupper(Str::random(4));
        $domainService = Service::whereRaw('LOWER(slug) LIKE ?', ['%dominio%'])->first()
            ?? Service::where('is_active', true)->first();

        $serviceRequest = DB::transaction(function () use ($domain, $protocol, $domainService, $expectedTitle): ServiceRequest {
            $sr = ServiceRequest::create([
                'protocol' => $protocol,
                'client_id' => $domain->client_id,
                'user_id' => Auth::id(),
                'service_id' => $domainService?->id,
                'name' => Auth::user()->name,
                'company' => $domain->client?->display_name ?? Auth::user()->name,
                'email' => Auth::user()->email,
                'phone' => Auth::user()->phone,
                'service_title' => $expectedTitle,
                'description' => "Solicitação de renovação anual do domínio {$domain->domain_name} (vencimento atual: ".($domain->expiration_date ? $domain->expiration_date->format('d/m/Y') : 'N/D').').',
                'estimated_budget' => $domain->renewal_price,
                'status' => 'new',
            ]);

            RequestStatusHistory::create([
                'service_request_id' => $sr->id,
                'old_status' => null,
                'new_status' => 'new',
                'comment' => "Solicitação de renovação iniciada pelo cliente no Portal para {$domain->domain_name}.",
                'user_id' => Auth::id(),
            ]);

            return $sr;
        });

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'portal.domain_renewal_requested',
            'subject_type' => Domain::class,
            'subject_id' => $domain->id,
            'details' => [
                'domain_name' => $domain->domain_name,
                'protocol' => $serviceRequest->protocol,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', "Solicitação de renovação para {$domain->domain_name} registrada (Protocolo {$protocol})! Nossa equipe enviará a fatura.");
    }
}
