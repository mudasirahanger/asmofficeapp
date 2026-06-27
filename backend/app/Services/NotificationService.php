<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use App\Models\Project;
use App\Models\DeviceToken;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Create an in-app notification and send push notification.
     */
    public function notify(
        int $userId,
        string $message,
        string $type = 'general',
        ?int $projectId = null,
        ?string $key = null
    ): ?Notification {
        // Check for duplicate key notification (e.g. daily deadline)
        if ($key && Notification::where('user_id', $userId)->where('key', $key)->exists()) {
            return null;
        }

        $notification = Notification::create([
            'user_id'    => $userId,
            'project_id' => $projectId,
            'key'        => $key,
            'message'    => $message,
            'type'       => $type,
        ]);

        // Send push notification
        $this->sendPush($userId, $message, $projectId);

        return $notification;
    }

    /**
     * Notify multiple users at once.
     */
    public function notifyMany(
        array $userIds,
        string $message,
        string $type = 'general',
        ?int $projectId = null,
        ?string $key = null
    ): void {
        foreach (array_unique($userIds) as $userId) {
            $this->notify($userId, $message, $type, $projectId, $key);
        }
    }

    /**
     * Send push notification via Expo Push API.
     */
    protected function sendPush(int $userId, string $message, ?int $projectId = null): void
    {
        $tokens = DeviceToken::where('user_id', $userId)
            ->whereNotNull('expo_push_token')
            ->pluck('expo_push_token')
            ->toArray();

        if (empty($tokens)) return;

        $messages = array_map(function ($token) use ($message, $projectId) {
            return [
                'to'    => $token,
                'sound' => 'default',
                'title' => 'Office Hub',
                'body'  => $message,
                'data'  => ['projectId' => $projectId],
            ];
        }, $tokens);

        try {
            Http::withHeaders(['Content-Type' => 'application/json'])
                ->post(config('app.expo_push_url', 'https://exp.host/--/api/v2/push/send'), $messages);
        } catch (\Exception $e) {
            Log::warning('Push notification failed: ' . $e->getMessage());
        }
    }

    // ================================================================
    // EVENT-SPECIFIC NOTIFICATION METHODS
    // ================================================================

    public function projectAssigned(Project $project, User $assignee): void
    {
        $this->notify(
            $assignee->id,
            "📋 New project assigned: \"{$project->title}\"",
            'assignment',
            $project->id
        );
    }

    public function projectSubAssigned(Project $project, User $subAssignee): void
    {
        $this->notify(
            $subAssignee->id,
            "📋 Task assigned to you: \"{$project->title}\"",
            'assignment',
            $project->id
        );
    }

    public function progressUpdated(Project $project, User $updater): void
    {
        $targets = collect();

        // Notify creator (if different)
        if ($project->created_by !== $updater->id) {
            $targets->push($project->created_by);
        }

        // Notify assignee (if different)
        if ($project->assigned_to && $project->assigned_to !== $updater->id) {
            $targets->push($project->assigned_to);
        }

        // Notify department head
        if ($project->department && $project->department->head_id && $project->department->head_id !== $updater->id) {
            $targets->push($project->department->head_id);
        }

        // Notify founders
        User::where('role', 'founder')->where('id', '!=', $updater->id)->pluck('id')->each(function ($id) use ($targets) {
            $targets->push($id);
        });

        $this->notifyMany(
            $targets->unique()->toArray(),
            "📝 Progress updated on \"{$project->title}\" by {$updater->name}",
            'progress',
            $project->id
        );
    }

    public function projectCompleted(Project $project): void
    {
        $targets = collect();

        // Notify founders
        User::where('role', 'founder')->pluck('id')->each(fn($id) => $targets->push($id));

        // Notify accounts
        User::where('role', 'accounts')->pluck('id')->each(fn($id) => $targets->push($id));

        $this->notifyMany(
            $targets->unique()->toArray(),
            "✅ Project completed: \"{$project->title}\"",
            'completion',
            $project->id
        );
    }

    public function projectBilled(Project $project): void
    {
        User::where('role', 'founder')->each(function ($user) use ($project) {
            $this->notify($user->id, "💰 Project billed: \"{$project->title}\"", 'billing', $project->id);
        });
    }

    public function deadlineMissed(Project $project, string $dateKey): void
    {
        $targets = collect();

        User::where('role', 'founder')->pluck('id')->each(fn($id) => $targets->push($id));

        if ($project->assigned_to) $targets->push($project->assigned_to);
        if ($project->sub_assigned_to) $targets->push($project->sub_assigned_to);
        if ($project->department && $project->department->head_id) {
            $targets->push($project->department->head_id);
        }

        $this->notifyMany(
            $targets->unique()->toArray(),
            "⚠️ Deadline missed: \"{$project->title}\" was due " . $project->deadline?->format('d M Y'),
            'deadline',
            $project->id,
            "dl_{$project->id}_{$dateKey}"
        );
    }

    public function leaveSubmitted(\App\Models\LeaveRequest $leave): void
    {
        $user = $leave->user;
        $targets = collect();

        // Notify manager
        if ($user->reporting_to) {
            $targets->push($user->reporting_to);
        }

        // Notify founders, HR, and accounts, reception
        User::whereIn('role', ['founder', 'hr', 'accounts', 'reception'])->pluck('id')->each(fn($id) => $targets->push($id));

        $this->notifyMany(
            $targets->unique()->toArray(),
            "📅 Leave request from {$user->name}: {$leave->start_date->format('d M')}–{$leave->end_date->format('d M')}",
            'leave'
        );
    }

    public function leaveDecided(\App\Models\LeaveRequest $leave): void
    {
        $this->notify(
            $leave->user_id,
            "📅 Your leave has been {$leave->status}",
            'leave'
        );
    }
}
