<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Services\NotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class CheckDeadlineNotifications extends Command
{
    protected $signature   = 'notifications:check-deadlines';
    protected $description = 'Check for missed project deadlines and send notifications';

    public function handle(NotificationService $notifier): void
    {
        $today = now()->toDateString();

        $overdueProjects = Project::whereNotIn('status', ['completed', 'billed'])
            ->whereNotNull('deadline')
            ->where('deadline', '<', $today)
            ->with(['department', 'assignedTo', 'subAssignedTo'])
            ->get();

        $this->info("Found {$overdueProjects->count()} overdue projects");

        foreach ($overdueProjects as $project) {
            $notifier->deadlineMissed($project, $today);
            $this->line(" → Notified for: {$project->title}");
        }

        $this->info('Deadline notifications check complete.');
    }
}
