<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\View\View;

class AdminClientController extends Controller
{
    public function index(Request $request): View
    {
        $query = Client::with('user')
            ->withCount(['projects', 'serviceRequests', 'domains', 'quotations']);

        if ($request->filled('search')) {
            $like = '%'.mb_strtolower(trim((string) $request->search)).'%';
            $query->where(function ($q) use ($like): void {
                $q->whereRaw('LOWER(company_name) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(name) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(email) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(COALESCE(document, \'\')) LIKE ?', [$like]);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $clients = $query->orderBy('created_at', 'desc')->paginate(10)->withQueryString();

        return view('admin.clients.index', compact('clients'));
    }

    public function create(): View
    {
        return view('admin.clients.create');
    }

    public function store(Request $request): RedirectResponse
    {
        $createAccount = $request->boolean('create_user_account');

        $rules = [
            'company_name' => ['required', 'string', 'max:255'],
            'trade_name' => ['nullable', 'string', 'max:255'],
            'document' => ['nullable', 'string', 'max:30', 'unique:clients,document'],
            'contact_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:clients,email'],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:50'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'notes' => ['nullable', 'string'],
            'status' => ['required', 'in:active,inactive,lead'],
            'create_user_account' => ['nullable', 'boolean'],
            'password' => ['nullable', 'string', 'min:6'],
        ];

        if ($createAccount) {
            $rules['email'][] = 'unique:users,email';
        }

        $validated = $request->validate($rules);
        $generatedPassword = null;

        if ($createAccount && empty($validated['password'])) {
            $generatedPassword = Str::password(12, true, true, false, false);
        }

        $client = DB::transaction(function () use ($validated, $createAccount, $generatedPassword): Client {
            $userId = null;

            if ($createAccount) {
                $plainPassword = ! empty($validated['password']) ? $validated['password'] : $generatedPassword;
                $user = User::create([
                    'name' => $validated['contact_name'],
                    'email' => $validated['email'],
                    'phone' => $validated['phone'] ?? null,
                    'password' => Hash::make((string) $plainPassword),
                    'role' => 'client',
                    'is_active' => true,
                ]);
                $userId = $user->id;
            }

            return Client::create([
                'user_id' => $userId,
                'name' => $validated['contact_name'],
                'company_name' => $validated['company_name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'document' => $validated['document'] ?? null,
                'address' => $validated['address'] ?? null,
                'city' => $validated['city'] ?? null,
                'state' => $validated['state'] ?? null,
                'postal_code' => $validated['postal_code'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'status' => $validated['status'],
            ]);
        });

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'client.created',
            'subject_type' => Client::class,
            'subject_id' => $client->id,
            'details' => ['company_name' => $client->company_name, 'email' => $client->email],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $message = $generatedPassword !== null
            ? "Cliente cadastrado com sucesso! Senha temporária gerada para o Portal: {$generatedPassword} (copie e envie ao cliente)."
            : 'Cliente cadastrado com sucesso!';

        return redirect()->route('admin.clients.show', $client)->with('success', $message);
    }

    public function show(Client $client): View
    {
        $client->load([
            'user',
            'serviceRequests.service',
            'quotations' => fn ($q) => $q->latest(),
            'projects.stages',
            'domains',
            'advertisingCampaigns',
            'contracts',
            'financialTransactions' => fn ($q) => $q->latest('due_date'),
        ]);

        return view('admin.clients.show', compact('client'));
    }

    public function edit(Client $client): View
    {
        return view('admin.clients.edit', compact('client'));
    }

    public function update(Request $request, Client $client): RedirectResponse
    {
        $validated = $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'trade_name' => ['nullable', 'string', 'max:255'],
            'document' => ['nullable', 'string', 'max:30', 'unique:clients,document,'.$client->id],
            'contact_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:clients,email,'.$client->id],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:50'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'notes' => ['nullable', 'string'],
            'status' => ['required', 'in:active,inactive,lead'],
        ]);

        $client->update([
            'name' => $validated['contact_name'],
            'company_name' => $validated['company_name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'document' => $validated['document'] ?? null,
            'address' => $validated['address'] ?? null,
            'city' => $validated['city'] ?? null,
            'state' => $validated['state'] ?? null,
            'postal_code' => $validated['postal_code'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'status' => $validated['status'],
        ]);

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'client.updated',
            'subject_type' => Client::class,
            'subject_id' => $client->id,
            'details' => ['company_name' => $client->company_name, 'status' => $client->status],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->route('admin.clients.show', $client)->with('success', 'Dados do cliente atualizados!');
    }

    public function destroy(Request $request, Client $client): RedirectResponse
    {
        $companyName = $client->display_name;
        $clientId = $client->id;
        $client->delete();

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'client.deleted',
            'subject_type' => Client::class,
            'subject_id' => $clientId,
            'details' => ['company_name' => $companyName],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->route('admin.clients.index')->with('success', 'Cliente excluído com sucesso.');
    }
}
