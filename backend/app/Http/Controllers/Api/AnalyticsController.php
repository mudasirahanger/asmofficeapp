<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Project;
use App\Models\User;
use App\Models\Attendance;
use Illuminate\Support\Facades\Cache;

class AnalyticsController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // RBAC Check
        if (!in_array($user->role, ['founder', 'hr'])) {
            return response()->json(['message' => 'Unauthorized for analytics'], 403);
        }

        // Cache the analytics data for 10 minutes
        $data = Cache::remember('analytics_dashboard', 600, function () {
            $totalProjects = Project::count();
            $completedProjects = Project::where('status', 'completed')->count();
            $completionRate = $totalProjects > 0 ? round(($completedProjects / $totalProjects) * 100, 1) : 0;

            $activeUsersToday = Attendance::whereDate('created_at', today())->distinct('user_id')->count('user_id');
            $totalUsers = User::count();

            $projectsByStatus = Project::selectRaw('status, count(*) as count')
                ->groupBy('status')
                ->get()
                ->mapWithKeys(function ($item) {
                    return [$item->status => $item->count];
                });

            return [
                'overview' => [
                    'total_projects' => $totalProjects,
                    'completed_projects' => $completedProjects,
                    'completion_rate' => $completionRate,
                    'active_users_today' => $activeUsersToday,
                    'total_users' => $totalUsers,
                ],
                'projects_by_status' => $projectsByStatus,
            ];
        });

        return response()->json($data);
    }
}
