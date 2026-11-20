<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\FinancialTransaction;
use App\Models\Payment;
use App\Models\Project;
use App\Models\Quotation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\View\View;

class AdminFinanceController extends Controller
{
    public function index(Request $request): View
    {
        $query = FinancialTransaction::with(['client', 'project']);

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $transactions = $query->orderBy('due_date', 'desc')->paginate(12)->withQueryString();

        $stats = FinancialTransaction::query()
            ->selectRaw("
                COALESCE(SUM(CASE WHEN type = 'income' AND status = 'paid' THEN amount ELSE 0 END), 0) AS total_income,
                COALESCE(SUM(CASE WHEN type = 'income' AND status IN ('pending', 'overdue') THEN amount ELSE 0 END), 0) AS pending_income,
                COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'paid' THEN amount ELSE 0 END), 0) AS total_expense
            ")
            ->first();

        $totalIncome = (float) ($stats->total_income ?? 0);
        $pendingIncome = (float) ($stats->pending_income ?? 0);
        $totalExpense = (float) ($stats->total_expense ?? 0);
        $netBalance = $totalIncome - $totalExpense;

        $clients = Client::where('status', 'active')->orderBy('company_name')->get();
        $projects = Project::with('client')->orderBy('created_at', 'desc')->get();
        $recentQuotations = Quotation::with('client')->orderBy('created_at', 'desc')->take(6)->get();

        return view('admin.finance.index', compact(
            'transactions',
            'totalIncome',
            'pendingIncome',
            'totalExpense',
            'netBalance',
            'clients',
            'projects',
            'recentQuotations'
        ));
    }

    public function store(Request $request): RedirectResponse
    {
        if (! $request->filled('due_date') && $request->filled('transaction_date')) {
            $request->merge(['due_date' => $request->input('transaction_date')]);
        }

        if ($request->input('status') === 'completed') {
            $request->merge(['status' => 'paid']);
        }

        $validated = $request->validate([
            'client_id' => ['nullable', 'exists:clients,id'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'type' => ['required', 'in:income,expense'],
            'category' => ['required', 'string', 'max:100'],
            'title' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'due_date' => ['required', 'date'],
            'payment_method' => ['nullable', 'string', 'max:50'],
            'status' => ['required', 'in:pending,paid,cancelled,overdue'],
            'description' => ['nullable', 'string'],
        ]);

        if (! empty($validated['project_id'])) {
            $project = Project::find($validated['project_id']);
            if ($project !== null) {
                if (empty($validated['client_id'])) {
                    $validated['client_id'] = $project->client_id;
                } elseif ((int) $validated['client_id'] !== (int) $project->client_id) {
                    return back()->withInput()->withErrors([
                        'project_id' => 'O projeto selecionado não pertence ao cliente informado.',
                    ]);
                }
            }
        }

        $transaction = DB::transaction(function () use ($validated): FinancialTransaction {
            $status = $validated['status'];
            $paidDate = $status === 'paid' ? $validated['due_date'] : null;

            $transaction = FinancialTransaction::create([
                'client_id' => $validated['client_id'] ?? null,
                'project_id' => $validated['project_id'] ?? null,
                'type' => $validated['type'],
                'category' => $validated['category'],
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'amount' => $validated['amount'],
                'due_date' => $validated['due_date'],
                'paid_date' => $paidDate,
                'status' => $status,
                'payment_method' => $validated['payment_method'] ?? 'PIX',
            ]);

            if ($status === 'paid' && $transaction->type === 'income' && $transaction->client_id) {
                Payment::create([
                    'financial_transaction_id' => $transaction->id,
                    'client_id' => $transaction->client_id,
                    'amount' => $transaction->amount,
                    'payment_method' => $this->normalizePaymentMethod($transaction->payment_method),
                    'status' => 'approved',
                    'transaction_id' => 'PAY-'.date('Ymd').'-'.strtoupper(Str::random(6)),
                    'paid_at' => now(),
                ]);
            }

            return $transaction;
        });

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'finance.transaction_created',
            'subject_type' => FinancialTransaction::class,
            'subject_id' => $transaction->id,
            'details' => [
                'title' => $transaction->title,
                'type' => $transaction->type,
                'amount' => $transaction->amount,
                'status' => $transaction->status,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->route('admin.finance.index')->with('success', 'Lançamento financeiro registrado com sucesso!');
    }

    public function markAsPaid(Request $request, FinancialTransaction $transaction): RedirectResponse
    {
        if ($transaction->status === 'paid') {
            return back()->with('success', 'Este lançamento já está marcado como pago.');
        }

        DB::transaction(function () use ($transaction): void {
            $transaction->update([
                'status' => 'paid',
                'paid_date' => now()->toDateString(),
            ]);

            if ($transaction->type === 'income' && $transaction->client_id) {
                Payment::firstOrCreate(
                    ['financial_transaction_id' => $transaction->id],
                    [
                        'client_id' => $transaction->client_id,
                        'amount' => $transaction->amount,
                        'payment_method' => $this->normalizePaymentMethod($transaction->payment_method),
                        'status' => 'approved',
                        'transaction_id' => 'PAY-'.date('Ymd').'-'.strtoupper(Str::random(6)),
                        'paid_at' => now(),
                    ]
                );
            }
        });

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'finance.transaction_paid',
            'subject_type' => FinancialTransaction::class,
            'subject_id' => $transaction->id,
            'details' => ['title' => $transaction->title, 'amount' => $transaction->amount],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', 'Pagamento confirmado com sucesso!');
    }

    public function destroy(Request $request, FinancialTransaction $transaction): RedirectResponse
    {
        $title = $transaction->title;
        $transactionId = $transaction->id;
        $transaction->delete();

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'finance.transaction_deleted',
            'subject_type' => FinancialTransaction::class,
            'subject_id' => $transactionId,
            'details' => ['title' => $title],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->route('admin.finance.index')->with('success', 'Lançamento financeiro excluído.');
    }

    private function normalizePaymentMethod(?string $method): string
    {
        $normalized = strtolower((string) $method);

        if (str_contains($normalized, 'cart') || str_contains($normalized, 'credit')) {
            return 'credit_card';
        }

        if (str_contains($normalized, 'boleto') || str_contains($normalized, 'slip')) {
            return 'bank_slip';
        }

        if (str_contains($normalized, 'transf') || str_contains($normalized, 'ted')) {
            return 'transfer';
        }

        return 'pix';
    }
}
