<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\FinancialTransaction;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class PortalFinanceController extends Controller
{
    public function index(): View
    {
        $client = Auth::user()->client;
        $transactions = FinancialTransaction::where('client_id', $client ? $client->id : 0)
            ->where('type', 'income')
            ->with('project')
            ->orderBy('due_date', 'desc')
            ->paginate(12);

        return view('portal.finance.index', compact('transactions'));
    }
}
