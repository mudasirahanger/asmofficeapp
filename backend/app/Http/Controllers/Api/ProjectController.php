<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ProjectController extends Controller
{
    public function __construct(private NotificationService $notifier) {}

    public function index(Request $request)
    {
        $user = $request->user()->load('departments');

        $query = Project::visible($user)
            ->with(['department', 'assignedTo', 'subAssignedTo', 'createdBy'])
            ->orderByDesc('updated_at');

        // Filters
        if ($request->status && $request->status !== 'all') {
            if ($request->status === 'overdue') {
                $query->whereNotIn('status', ['completed', 'billed'])
                      ->where('deadline', '<', now()->toDateString());
            } else {
                $query->where('status', $request->status);
            }
        }

        if ($request->department_id) {
            $query->where('department_id', $request->department_id);
        }

        // Support filtering by dept slug (from mobile app)
        if ($request->dept && $request->dept !== 'all') {
            $query->whereHas('department', fn($q) => $q->where('slug', $request->dept));
        }


        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('title', 'like', "%{$request->search}%")
                  ->orWhere('client', 'like', "%{$request->search}%");
            });
        }

        $projects = $query->paginate($request->per_page ?? 50);

        return response()->json($projects);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if (!$user->isFounder() && !$user->isHead()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'title'         => 'required|string|max:255',
            'description'   => 'nullable|string',
            'client'        => 'nullable|string|max:255',
            'department_id' => 'required|exists:departments,id',
            'assigned_to'   => 'nullable|exists:users,id',
            'deadline'      => 'required|date',
            'priority'      => 'in:low,medium,high',
            'notes'         => 'nullable|string',
        ]);

        // Heads can only create for their departments
        if ($user->isHead()) {
            $deptIds = $user->getDepartmentIds();
            if (!in_array($data['department_id'], $deptIds)) {
                return response()->json(['message' => 'Unauthorized for this department'], 403);
            }
        }

        $project = Project::create(array_merge($data, [
            'created_by'     => $user->id,
            'status'         => 'assigned',
            'server_version' => 1,
            'priority'       => $data['priority'] ?? 'medium',
        ]));

        $project->load(['department', 'assignedTo', 'subAssignedTo', 'createdBy']);

        // Notify assigned user
        if ($project->assigned_to) {
            $this->notifier->projectAssigned($project, $project->assignedTo);
        }

        return response()->json($project, 201);
    }

    public function show(Request $request, Project $project)
    {
        $user = $request->user()->load('departments');

        if (!$this->canView($user, $project)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $project->load(['department', 'assignedTo', 'subAssignedTo', 'createdBy', 'progressUpdates.user']);

        return response()->json([
            'project'  => $project,
            'progress' => $project->progressUpdates,
            'overdue'  => $project->isOverdue(),
            'progress_percentage' => $project->getLatestProgressPercentage(),
        ]);
    }

    public function update(Request $request, Project $project)
    {
        $user = $request->user();

        if (!$user->isFounder() && !$user->isHead()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'title'         => 'sometimes|string|max:255',
            'description'   => 'nullable|string',
            'client'        => 'nullable|string|max:255',
            'department_id' => 'sometimes|exists:departments,id',
            'assigned_to'   => 'nullable|exists:users,id',
            'deadline'      => 'sometimes|date',
            'priority'      => 'sometimes|in:low,medium,high',
            'notes'         => 'nullable|string',
            'invoice_data'  => 'nullable|array',
        ]);

        if ($user->isHead()) {
            if (!in_array($project->department_id, $user->getDepartmentIds())) {
                return response()->json(['message' => 'Unauthorized for this project'], 403);
            }
            if (isset($data['department_id']) && !in_array($data['department_id'], $user->getDepartmentIds())) {
                return response()->json(['message' => 'Cannot change to a department you do not manage'], 403);
            }
        }

        $oldAssignedTo    = $project->assigned_to;
        $oldSubAssignedTo = $project->sub_assigned_to;

        $project->increment('server_version');
        $project->update($data);
        $project->load(['department', 'assignedTo', 'subAssignedTo', 'createdBy']);

        // Notifications for new assignment
        if (isset($data['assigned_to']) && $data['assigned_to'] !== $oldAssignedTo && $project->assignedTo) {
            $this->notifier->projectAssigned($project, $project->assignedTo);
        }

        return response()->json($project);
    }

    public function complete(Request $request, Project $project)
    {
        $user = $request->user()->load('departments');

        $canComplete = $user->isFounder()
            || $project->assigned_to === $user->id
            || $project->sub_assigned_to === $user->id
            || ($user->isHead() && in_array($project->department_id, $user->getDepartmentIds()));

        if (!$canComplete) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (in_array($project->status, ['completed', 'billed'])) {
            return response()->json(['message' => 'Project already completed or billed'], 422);
        }

        $project->update([
            'status'         => 'completed',
            'completed_at'   => now(),
            'server_version' => $project->server_version + 1,
        ]);

        $this->notifier->projectCompleted($project);

        return response()->json($project->fresh(['department', 'assignedTo', 'subAssignedTo', 'createdBy']));
    }

    public function markBilled(Request $request, Project $project)
    {
        $user = $request->user();

        if (!$user->isFounder() && !$user->isAccounts()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($project->status !== 'completed') {
            return response()->json(['message' => 'Project must be completed first'], 422);
        }

        $project->update([
            'status'         => 'billed',
            'billed_at'      => now(),
            'server_version' => $project->server_version + 1,
        ]);

        $this->notifier->projectBilled($project);

        return response()->json($project->fresh(['department', 'assignedTo', 'subAssignedTo', 'createdBy']));
    }

    public function changeDeadline(Request $request, Project $project)
    {
        $user = $request->user();

        if (!$user->isFounder()) {
            return response()->json(['message' => 'Only founders can change deadlines'], 403);
        }

        $data = $request->validate(['deadline' => 'required|date']);

        $project->update(['deadline' => $data['deadline'], 'server_version' => $project->server_version + 1]);

        return response()->json($project->fresh(['department', 'assignedTo', 'subAssignedTo']));
    }

    public function subAssign(Request $request, Project $project)
    {
        $user = $request->user()->load('departments');

        if (!$user->isFounder() && !($user->isHead() && in_array($project->department_id, $user->getDepartmentIds()))) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $data = $request->validate(['sub_assigned_to' => 'required|exists:users,id']);

        $oldSub = $project->sub_assigned_to;
        $project->update(['sub_assigned_to' => $data['sub_assigned_to'], 'server_version' => $project->server_version + 1]);

        $project->load('subAssignedTo');
        if ($project->sub_assigned_to !== $oldSub && $project->subAssignedTo) {
            $this->notifier->projectSubAssigned($project, $project->subAssignedTo);
        }

        return response()->json($project->fresh(['department', 'assignedTo', 'subAssignedTo']));
    }

    private function canView(User $user, Project $project): bool
    {
        if ($user->isFounder()) return true;

        $inDepartment = in_array($project->department_id, $user->getDepartmentIds());
        $isAssigned = $project->assigned_to === $user->id || $project->sub_assigned_to === $user->id;

        if ($user->isAccounts() && in_array($project->status, ['completed', 'billed'])) {
            return true;
        }

        return $inDepartment || $isAssigned;
    }
}
