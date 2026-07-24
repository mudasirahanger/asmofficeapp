<?php

namespace App\Services;

use App\Models\User;
use App\Models\Client;
use App\Models\Project;
use App\Models\ProgressUpdate;
use App\Models\Attendance;
use App\Models\LeaveRequest;
use App\Models\Notification;
use App\Models\SyncLog;
use Illuminate\Support\Carbon;

class SyncService
{
    /**
     * Full refresh — return all data for user.
     */
    public function fullRefresh(User $user): array
    {
        return [
            'user'         => $user->load('departments'),
            'departments'  => \App\Models\Department::with('head', 'members')->get(),
            'users'        => User::with('departments')->get(),
            'projects'     => Project::visible($user)->with(['department', 'assignedTo', 'subAssignedTo', 'createdBy'])->get(),
            'progress'     => $this->progressForUser($user),
            'attendance'   => $this->attendanceForUser($user),
            'leaves'       => $this->leavesForUser($user),
            'notifications'=> Notification::where('user_id', $user->id)->orderByDesc('created_at')->limit(100)->get(),
            'timestamp'    => now()->toISOString(),
        ];
    }

    /**
     * Pull changes since a given timestamp.
     */
    public function pullSince(User $user, string $since): array
    {
        $ts = Carbon::parse($since);
        return [
            'projects'      => Project::visible($user)->where('updated_at', '>=', $ts)->with(['department', 'assignedTo', 'subAssignedTo', 'createdBy'])->get(),
            'progress'      => $this->progressForUser($user, $ts),
            'attendance'    => $this->attendanceForUser($user, $ts),
            'leaves'        => $this->leavesForUser($user, $ts),
            'notifications' => Notification::where('user_id', $user->id)->where('updated_at', '>=', $ts)->get(),
            'timestamp'     => now()->toISOString(),
        ];
    }

    /**
     * Process offline sync push from mobile.
     */
    public function processPush(User $user, string $deviceId, array $actions): array
    {
        $results = [];
        foreach ($actions as $action) {
            $log = SyncLog::create([
                'user_id'     => $user->id,
                'device_id'   => $deviceId,
                'entity_type' => $action['entity_type'] ?? 'unknown',
                'entity_id'   => $action['entity_id'] ?? null,
                'action'      => $action['action'] ?? 'unknown',
                'payload'     => $action['payload'] ?? [],
                'status'      => 'pending',
            ]);

            try {
                $result = $this->processAction($user, $action);
                $log->update(['status' => 'synced']);
                $results[] = ['id' => $action['local_id'] ?? null, 'status' => 'synced', 'data' => $result];
            } catch (\Exception $e) {
                $log->update(['status' => 'failed', 'error' => $e->getMessage()]);
                $results[] = ['id' => $action['local_id'] ?? null, 'status' => 'failed', 'error' => $e->getMessage()];
            }
        }
        return $results;
    }

    private function processAction(User $user, array $action): mixed
    {
        $payload = $action['payload'] ?? [];
        switch ($action['action']) {
            case 'create_project':
                // Only founder/head
                if (!$user->isFounder() && (!$user->isHead())) throw new \Exception('Unauthorized');
                if ($user->isHead() && !in_array($payload['department_id'], $user->getDepartmentIds())) {
                    throw new \Exception('Unauthorized for this department');
                }
                
                $safePayload = \Illuminate\Support\Arr::only($payload, ['title', 'description', 'client', 'client_id', 'department_id', 'assigned_to', 'deadline', 'priority', 'notes']);
                $safePayload = Client::resolveForProject($safePayload);

                return Project::create(array_merge($safePayload, ['created_by' => $user->id, 'server_version' => 1, 'status' => 'assigned']));

            case 'add_progress':
                $project = Project::findOrFail($payload['project_id']);
                
                // Authorize progress creation
                $canProgress = $user->isFounder()
                    || $project->assigned_to === $user->id
                    || $project->sub_assigned_to === $user->id
                    || ($user->isHead() && in_array($project->department_id, $user->getDepartmentIds()));

                if (!$canProgress) {
                    throw new \Exception('Unauthorized to update progress');
                }
                
                $safePayload = \Illuminate\Support\Arr::only($payload, ['text', 'percentage', 'progress_date']);

                $update = ProgressUpdate::create([
                    'project_id'    => $project->id,
                    'user_id'       => $user->id,
                    'text'          => $safePayload['text'],
                    'percentage'    => $safePayload['percentage'] ?? 0,
                    'progress_date' => $safePayload['progress_date'] ?? now()->toDateString(),
                ]);
                if ($project->status === 'assigned') {
                    $project->update(['status' => 'in_progress']);
                }
                return $update;

            case 'mark_complete':
                $project = Project::findOrFail($payload['project_id']);
                
                $canComplete = $user->isFounder()
                    || $project->assigned_to === $user->id
                    || $project->sub_assigned_to === $user->id
                    || ($user->isHead() && in_array($project->department_id, $user->getDepartmentIds()));

                if (!$canComplete) {
                    throw new \Exception('Unauthorized to complete project');
                }
                
                $project->update(['status' => 'completed', 'completed_at' => now(), 'server_version' => $project->server_version + 1]);
                return $project;

            case 'apply_leave':
                $safePayload = \Illuminate\Support\Arr::only($payload, ['start_date', 'end_date', 'type', 'reason']);
                return LeaveRequest::create(array_merge($safePayload, [
                    'user_id'    => $user->id,
                    'status'     => 'pending',
                    'applied_at' => now(),
                    'server_version' => 1,
                ]));

            case 'mark_attendance':
                if (!$user->isFounder() && !$user->isHead() && !$user->isAccounts() && !in_array($user->role, ['hr', 'reception'])) {
                    throw new \Exception('Unauthorized');
                }
                
                $safePayload = \Illuminate\Support\Arr::only($payload, ['status', 'check_in', 'check_out', 'check_in_at', 'check_out_at', 'check_in_latitude', 'check_in_longitude', 'check_out_latitude', 'check_out_longitude', 'check_in_location_accuracy', 'check_out_location_accuracy', 'check_in_platform', 'check_out_platform', 'check_in_device', 'check_out_device']);

                $att = Attendance::where('user_id', $payload['user_id'])
                    ->whereDate('date', $payload['date'])
                    ->first();
                if (!$att) {
                    $att = new Attendance(['user_id' => $payload['user_id'], 'date' => \Carbon\Carbon::parse($payload['date'])->startOfDay()]);
                }
                $att->fill(array_merge($safePayload, ['marked_by' => $user->id, 'server_version' => ($att->server_version ?? 0) + 1]));
                $att->save();
                return $att;

            default:
                throw new \Exception("Unknown action: {$action['action']}");
        }
    }

    private function progressForUser(User $user, ?\DateTime $since = null)
    {
        $query = ProgressUpdate::whereHas('project', fn($q) => $q->visible($user));
        if ($since) $query->where('updated_at', '>=', $since);
        return $query->with('user')->get();
    }

    private function attendanceForUser(User $user, ?\DateTime $since = null)
    {
        if ($user->isFounder() || $user->isAccounts() || $user->isHead()) {
            $query = Attendance::query();
        } else {
            $query = Attendance::where('user_id', $user->id);
        }
        if ($since) $query->where('updated_at', '>=', $since);
        return $query->get();
    }

    private function leavesForUser(User $user, ?\DateTime $since = null)
    {
        if ($user->isFounder()) {
            $query = LeaveRequest::query();
        } elseif ($user->isHead()) {
            $directReportIds = User::where('reporting_to', $user->id)->pluck('id');
            $query = LeaveRequest::where(function ($q) use ($user, $directReportIds) {
                $q->where('user_id', $user->id)->orWhereIn('user_id', $directReportIds);
            });
        } else {
            $query = LeaveRequest::where('user_id', $user->id);
        }
        if ($since) $query->where('updated_at', '>=', $since);
        return $query->with('user', 'approvedBy')->get();
    }
}
