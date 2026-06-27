<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProgressUpdate;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ProgressController extends Controller
{
    public function __construct(private NotificationService $notifier) {}

    public function index(Request $request, Project $project)
    {
        $user = $request->user()->load('departments');

        if (!$this->canViewProject($user, $project)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $progress = ProgressUpdate::where('project_id', $project->id)
            ->with('user')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($progress);
    }

    private function canViewProject(\App\Models\User $user, Project $project): bool
    {
        if ($user->isFounder()) return true;
        if ($user->isAccounts()) return in_array($project->status, ['completed', 'billed']);
        return in_array($project->department_id, $user->getDepartmentIds())
            || $project->assigned_to === $user->id
            || $project->sub_assigned_to === $user->id;
    }

    public function store(Request $request, Project $project)
    {
        $user = $request->user()->load('departments');

        $canProgress = $user->isFounder()
            || $project->assigned_to === $user->id
            || $project->sub_assigned_to === $user->id
            || in_array($project->department_id, $user->getDepartmentIds());

        if (!$canProgress) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (in_array($project->status, ['completed', 'billed'])) {
            return response()->json(['message' => 'Cannot add progress to a completed/billed project'], 422);
        }

        $data = $request->validate([
            'text'          => 'required|string',
            'percentage'    => 'required|integer|min:0|max:100',
            'progress_date' => 'nullable|date',
        ]);

        $update = ProgressUpdate::create([
            'project_id'    => $project->id,
            'user_id'       => $user->id,
            'text'          => $data['text'],
            'percentage'    => $data['percentage'],
            'progress_date' => $data['progress_date'] ?? now()->toDateString(),
            'server_version'=> 1,
        ]);

        // Auto flip to in_progress
        if ($project->status === 'assigned') {
            $project->update(['status' => 'in_progress', 'server_version' => $project->server_version + 1]);
        }

        $update->load('user');

        // Notify relevant people
        $this->notifier->progressUpdated($project->load('department'), $user);

        return response()->json($update, 201);
    }
}
