<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\DnsRecord;
use App\Models\Domain;
use App\Models\DomainRenewal;
use App\Models\FinancialTransaction;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class AdminDomainController extends Controller
{
    public function index(Request $request): View
    {
        $query = Domain::with(['client'])->withCount(['dnsRecords', 'renewals']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('expiring')) {
            $query->where('expiration_date', '<=', Carbon::now()->addDays(30));
        }

        if ($request->filled('search')) {
            $like = '%'.mb_strtolower(trim((string) $request->search)).'%';
            $query->where(function ($q) use ($like): void {
                $q->whereRaw('LOWER(domain_name) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(COALESCE(registrar, \'\')) LIKE ?', [$like]);
            });
        }

        $domains = $query->orderBy('expiration_date', 'asc')->paginate(12)->withQueryString();
        $clients = Client::where('status', 'active')->orderBy('company_name')->get();

        $today = Carbon::now()->startOfDay()->toDateString();
        $inThirtyDays = Carbon::now()->addDays(30)->toDateString();
        $stats = Domain::query()
            ->selectRaw(
                'COUNT(*) AS total,
                 SUM(CASE WHEN expiration_date <= ? AND expiration_date >= ? THEN 1 ELSE 0 END) AS expiring,
                 SUM(CASE WHEN expiration_date < ? THEN 1 ELSE 0 END) AS expired',
                [$inThirtyDays, $today, $today]
            )
            ->first();

        $totalDomains = (int) ($stats->total ?? 0);
        $expiringCount = (int) ($stats->expiring ?? 0);
        $expiredCount = (int) ($stats->expired ?? 0);

        return view('admin.domains.index', compact('domains', 'clients', 'totalDomains', 'expiringCount', 'expiredCount'));
    }

    public function store(Request $request): RedirectResponse
    {
        if (! $request->filled('registration_date') && $request->filled('registered_at')) {
            $request->merge(['registration_date' => $request->input('registered_at')]);
        }

        if (! $request->filled('expiration_date') && $request->filled('expires_at')) {
            $request->merge(['expiration_date' => $request->input('expires_at')]);
        }

        $validated = $request->validate([
            'client_id' => ['required', 'exists:clients,id'],
            'domain_name' => ['required', 'string', 'max:255', 'unique:domains,domain_name'],
            'registrar' => ['nullable', 'string', 'max:100'],
            'registration_date' => ['required', 'date'],
            'expiration_date' => ['required', 'date', 'after:registration_date'],
            'renewal_price' => ['nullable', 'numeric', 'min:0'],
            'auto_renew' => ['nullable', 'boolean'],
            'nameservers' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        $expirationDate = Carbon::parse($validated['expiration_date']);
        $status = 'active';
        if ($expirationDate->isPast()) {
            $status = 'expired';
        } elseif ($expirationDate->lte(Carbon::now()->addDays(30))) {
            $status = 'expiring_soon';
        }

        $domain = DB::transaction(function () use ($validated, $request, $status): Domain {
            $domain = Domain::create([
                'client_id' => $validated['client_id'],
                'domain_name' => strtolower(trim($validated['domain_name'])),
                'registrar' => ! empty($validated['registrar']) ? $validated['registrar'] : 'Registro.br',
                'registration_date' => $validated['registration_date'],
                'expiration_date' => $validated['expiration_date'],
                'renewal_price' => $validated['renewal_price'] ?? 89.90,
                'status' => $status,
                'auto_renew' => $request->boolean('auto_renew'),
                'nameservers' => $validated['nameservers'] ?? "ns1.gundjatech.com\nns2.gundjatech.com",
                'notes' => $validated['notes'] ?? null,
            ]);

            $domain->dnsRecords()->create(['type' => 'A', 'host' => '@', 'value' => '172.67.142.98', 'ttl' => 3600]);
            $domain->dnsRecords()->create(['type' => 'CNAME', 'host' => 'www', 'value' => $domain->domain_name, 'ttl' => 3600]);

            return $domain;
        });

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'domain.created',
            'subject_type' => Domain::class,
            'subject_id' => $domain->id,
            'details' => ['domain_name' => $domain->domain_name],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->route('admin.domains.show', $domain)->with('success', 'Domínio cadastrado com sucesso!');
    }

    public function show(Domain $domain): View
    {
        $domain->load([
            'client',
            'dnsRecords' => fn ($q) => $q->orderBy('type')->orderBy('host'),
            'renewals' => fn ($q) => $q->orderBy('renewal_date', 'desc'),
        ]);

        return view('admin.domains.show', compact('domain'));
    }

    public function addDnsRecord(Request $request, Domain $domain): RedirectResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'in:A,AAAA,CNAME,MX,TXT,NS'],
            'host' => ['required', 'string', 'max:255'],
            'value' => ['required', 'string', 'max:255'],
            'ttl' => ['required', 'integer', 'min:60', 'max:86400'],
            'priority' => ['nullable', 'integer', 'min:0', 'max:65535'],
        ]);

        $domain->dnsRecords()->create($validated);

        return back()->with('success', 'Registro DNS adicionado com sucesso!');
    }

    public function deleteDnsRecord(DnsRecord $dnsRecord): RedirectResponse
    {
        $dnsRecord->delete();

        return back()->with('success', 'Registro DNS removido com sucesso!');
    }

    public function renewDomain(Request $request, Domain $domain): RedirectResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0'],
            'years' => ['required', 'integer', 'min:1', 'max:10'],
            'invoice_number' => ['nullable', 'string', 'max:100'],
            'register_finance' => ['nullable', 'boolean'],
        ]);

        $baseDate = $domain->expiration_date && $domain->expiration_date->isFuture()
            ? $domain->expiration_date->copy()
            : Carbon::now();

        $newExpiry = $baseDate->addYears((int) $validated['years']);
        $invoiceNumber = ! empty($validated['invoice_number']) ? $validated['invoice_number'] : 'REN-'.date('Ymd').'-'.$domain->id;

        DB::transaction(function () use ($domain, $validated, $newExpiry, $invoiceNumber, $request): void {
            DomainRenewal::create([
                'domain_id' => $domain->id,
                'renewal_date' => Carbon::now(),
                'next_expiration_date' => $newExpiry,
                'amount' => $validated['amount'],
                'invoice_number' => $invoiceNumber,
            ]);

            $domain->update([
                'expiration_date' => $newExpiry,
                'status' => 'active',
            ]);

            if ($request->boolean('register_finance')) {
                FinancialTransaction::create([
                    'client_id' => $domain->client_id,
                    'type' => 'income',
                    'category' => 'Renovação de Domínio',
                    'title' => "Renovação {$domain->domain_name} ({$validated['years']} ano(s))",
                    'description' => "Fatura {$invoiceNumber} - Novo vencimento em {$newExpiry->format('d/m/Y')}.",
                    'amount' => $validated['amount'],
                    'due_date' => Carbon::now(),
                    'paid_date' => Carbon::now(),
                    'status' => 'paid',
                    'payment_method' => 'PIX',
                ]);
            }
        });

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'domain.renewed',
            'subject_type' => Domain::class,
            'subject_id' => $domain->id,
            'details' => [
                'domain_name' => $domain->domain_name,
                'next_expiration_date' => $newExpiry->toDateString(),
                'amount' => $validated['amount'],
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', "Domínio renovado com sucesso até {$newExpiry->format('d/m/Y')}!");
    }
}
