<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if (!$user->isFounder() && !$user->isAccounts()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $readyForBilling = Project::where('status', 'completed')
            ->with(['department', 'assignedTo', 'createdBy'])
            ->orderByDesc('completed_at')
            ->get();

        $billedThisMonth = Project::where('status', 'billed')
            ->whereMonth('billed_at', now()->month)
            ->whereYear('billed_at', now()->year)
            ->count();

        $departmentOverview = \App\Models\Department::withCount([
            'members',
            'projects as unbilled_count' => function ($query) {
                $query->where('status', 'completed');
            },
            'projects as billed_count' => function ($query) {
                $query->where('status', 'billed')->whereMonth('billed_at', now()->month)->whereYear('billed_at', now()->year);
            }
        ])->get();

        $activeDepts = $departmentOverview->where('members_count', '>', 0)->count();

        $billedProjects = Project::where('status', 'billed')
            ->with(['department', 'assignedTo', 'createdBy'])
            ->orderByDesc('billed_at')
            ->get();

        return response()->json([
            'overview' => [
                'total_unbilled'     => $readyForBilling->count(),
                'total_billed'       => $billedThisMonth,
                'active_departments' => $activeDepts,
            ],
            'unbilled_projects'   => $readyForBilling,
            'billed_projects'     => $billedProjects,
            'department_overview' => $departmentOverview,
        ]);
    }
}
