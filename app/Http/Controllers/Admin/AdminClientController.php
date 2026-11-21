<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\ProjectAttachment;
use App\Models\RequestAttachment;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
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
        $request->merge([
            'email' => strtolower(trim((string) $request->input('email'))),
        ]);

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
                'trade_name' => $validated['trade_name'] ?? null,
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
        $request->merge([
            'email' => strtolower(trim((string) $request->input('email'))),
        ]);

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
            'trade_name' => $validated['trade_name'] ?? null,
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
        if ($client->projects()->whereIn('status', ['planning', 'in_progress', 'reviewing', 'on_hold'])->exists()) {
            return back()->with('error', 'Não é possível excluir este cliente pois há projetos ativos vinculados. Conclua ou exclua os projetos primeiro.');
        }

        if ($client->financialTransactions()->where('status', 'paid')->exists()) {
            return back()->with('error', 'Não é possível excluir este cliente pois existem lançamentos financeiros pagos vinculados. Inative o cadastro para preservar o histórico fiscal.');
        }

        $companyName = $client->display_name;
        $clientId = $client->id;

        $projectIds = $client->projects()->pluck('id')->all();
        $requestIds = $client->serviceRequests()->pluck('id')->all();
        $attachmentPaths = array_merge(
            $projectIds !== [] ? ProjectAttachment::whereIn('project_id', $projectIds)->pluck('file_path')->all() : [],
            $requestIds !== [] ? RequestAttachment::whereIn('service_request_id', $requestIds)->pluck('file_path')->all() : []
        );

        DB::transaction(function () use ($client): void {
            $linkedUser = $client->user;
            $client->delete();

            if ($linkedUser !== null && $linkedUser->role === UserRole::Client->value) {
                $linkedUser->update(['is_active' => false]);
                DB::table('sessions')->where('user_id', $linkedUser->id)->delete();
            }
        });

        foreach ($attachmentPaths as $filePath) {
            foreach (['local', 'public'] as $disk) {
                if (Storage::disk($disk)->exists($filePath)) {
                    Storage::disk($disk)->delete($filePath);
                }
            }
        }

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
