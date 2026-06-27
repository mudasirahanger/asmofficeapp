<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Project;
use App\Models\LeaveRequest;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user     = $request->user()->load('departments');
        $projects = Project::visible($user)->get();

        $active    = $projects->filter(fn($p) => in_array($p->status, ['assigned', 'in_progress']))->count();
        $completed = $projects->filter(fn($p) => $p->status === 'completed')->count();
        $overdue   = $projects->filter(fn($p) => $p->isOverdue())->count();

        $stats = [
            'active_projects' => $active,
            'completed'       => $completed,
            'overdue'         => $overdue,
        ];

        if ($user->isFounder() || $user->isAccounts()) {
            $stats['pending_billing'] = Project::where('status', 'completed')->count();
        } else {
            $stats['my_pending_leaves'] = LeaveRequest::where('user_id', $user->id)
                ->where('status', 'pending')->count();
        }

        // Department overview (founder only)
        $departmentOverview = null;
        if ($user->isFounder()) {
            $departmentOverview = Department::with('head')->get()->map(function ($dept) {
                $deptProjects = Project::where('department_id', $dept->id);
                return [
                    'id'             => $dept->id,
                    'slug'           => $dept->slug,
                    'name'           => $dept->name,
                    'color'          => $dept->color,
                    'head_name'      => $dept->head?->name,
                    'active_count'   => (clone $deptProjects)->whereIn('status', ['assigned', 'in_progress'])->count(),
                    'total_count'    => $deptProjects->count(),
                ];
            });
        }

        // Active projects (first 10)
        $activeProjects = Project::visible($user)
            ->whereIn('status', ['assigned', 'in_progress'])
            ->with(['department', 'assignedTo', 'subAssignedTo'])
            ->orderByDesc('updated_at')
            ->limit(10)
            ->get();

        // Pending leaves for founder/head
        $pendingLeaves = null;
        if ($user->isFounder() || $user->isHead()) {
            $query = LeaveRequest::where('status', 'pending')->with('user');
            if ($user->isHead()) {
                $directReportIds = \App\Models\User::where('reporting_to', $user->id)->pluck('id');
                $query->whereIn('user_id', $directReportIds);
            }
            $pendingLeaves = $query->orderByDesc('applied_at')->limit(5)->get();
        }

        return response()->json([
            'stats'               => $stats,
            'department_overview' => $departmentOverview,
            'active_projects'     => $activeProjects,
            'pending_leaves'      => $pendingLeaves,
        ]);
    }
}
