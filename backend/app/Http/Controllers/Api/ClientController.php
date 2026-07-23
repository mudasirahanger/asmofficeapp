<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    /**
     * Distinct client names derived from the `projects.client` free-text
     * column, aggregated with project counts. There is no separate Clients
     * table by design (see PRODUCTION_AUDIT.md) — this keeps "client" as a
     * lightweight label on a project rather than a first-class managed
     * entity, while still giving the app a real "Clients" list and letting
     * the project create/edit forms pull the full set of known client names
     * (not just whatever happened to be on the first page of /projects).
     *
     * Respects the same visibility rules as the project list itself
     * (Project::visible), so a head only sees clients from their own
     * department's projects, accounts only sees clients on completed/billed
     * work, and founders see everything.
     */
    public function index(Request $request)
    {
        $user = $request->user()->load('departments');

        $today = now()->toDateString();

        $rows = Project::visible($user)
            ->whereNotNull('client')
            ->where('client', '!=', '')
            ->selectRaw(
                "client,
                COUNT(*) as total_projects,
                SUM(CASE WHEN status NOT IN ('completed', 'billed') THEN 1 ELSE 0 END) as active_projects,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_projects,
                SUM(CASE WHEN status = 'billed' THEN 1 ELSE 0 END) as billed_projects,
                SUM(CASE WHEN status NOT IN ('completed', 'billed') AND deadline < ? THEN 1 ELSE 0 END) as overdue_projects,
                MAX(updated_at) as last_activity",
                [$today]
            )
            ->groupBy('client')
            ->orderBy('client')
            ->get();

        $clients = $rows->map(fn ($row) => [
            'name'               => $row->client,
            'total_projects'     => (int) $row->total_projects,
            'active_projects'    => (int) $row->active_projects,
            'completed_projects' => (int) $row->completed_projects,
            'billed_projects'    => (int) $row->billed_projects,
            'overdue_projects'   => (int) $row->overdue_projects,
            'last_activity'      => $row->last_activity,
        ]);

        return response()->json(['clients' => $clients]);
    }
}
