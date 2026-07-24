<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    /**
     * Every real Client row, with project counts scoped to what this user
     * is allowed to see (same rules as the project list — Project::visible).
     *
     * A client is included if either (a) it has no projects at all yet — a
     * freshly-added client via the "Add Client" button, which everyone with
     * view access should see — or (b) at least one of its projects is
     * visible to this user. A client whose only projects all belong to
     * departments/status this user can't see is omitted, same as before;
     * the distinction from a plain ">0 visible projects" filter is that it
     * no longer also hides brand-new, not-yet-linked clients.
     */
    public function index(Request $request)
    {
        $user = $request->user()->load('departments');
        $today = now()->toDateString();

        $clients = Client::query()
            ->withCount([
                'projects as total_projects'     => fn ($q) => $q->visible($user),
                'projects as active_projects'    => fn ($q) => $q->visible($user)->whereNotIn('status', ['completed', 'billed']),
                'projects as completed_projects' => fn ($q) => $q->visible($user)->where('status', 'completed'),
                'projects as billed_projects'    => fn ($q) => $q->visible($user)->where('status', 'billed'),
                'projects as overdue_projects'   => fn ($q) => $q->visible($user)
                    ->whereNotIn('status', ['completed', 'billed'])
                    ->where('deadline', '<', $today),
                // Unscoped count, used only to decide inclusion below — never
                // exposed in the response (would leak "this client has other
                // projects you can't see" to non-founders).
                'projects as all_projects_count' => fn ($q) => $q,
            ])
            ->orderBy('name')
            ->get()
            ->filter(fn ($c) => $c->all_projects_count === 0 || $c->total_projects > 0)
            ->map(fn ($c) => [
                'id'                 => $c->id,
                'name'                => $c->name,
                'total_projects'      => $c->total_projects,
                'active_projects'     => $c->active_projects,
                'completed_projects'  => $c->completed_projects,
                'billed_projects'     => $c->billed_projects,
                'overdue_projects'    => $c->overdue_projects,
                'last_activity'       => $c->projects()->visible($user)->max('updated_at'),
            ])
            ->values();

        return response()->json(['clients' => $clients]);
    }

    /**
     * Create a client directly (e.g. an "Add Client" button on the Clients
     * screen, as opposed to the implicit find-or-create that happens when
     * typing a new client name on the project form — see
     * Client::resolveForProject).
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user->isFounder()) {
            return response()->json(['message' => 'Only founders can manage clients'], 403);
        }

        $request->validate(['name' => 'required|string|max:255']);
        $name = trim($request->name);

        $existing = Client::whereRaw('LOWER(name) = ?', [strtolower($name)])->first();
        if ($existing) {
            return response()->json(['message' => 'A client with this name already exists.', 'client' => $existing], 422);
        }

        $client = Client::create(['name' => $name]);

        return response()->json(['client' => $client], 201);
    }

    /**
     * Rename a client. Cascades the new name onto every linked project's
     * denormalized `client` string column, since billing, invoices, and the
     * project detail/list screens all still read that column directly
     * rather than the relation.
     */
    public function update(Request $request, Client $client)
    {
        $user = $request->user();
        if (!$user->isFounder()) {
            return response()->json(['message' => 'Only founders can manage clients'], 403);
        }

        $request->validate(['name' => 'required|string|max:255']);
        $name = trim($request->name);

        $duplicate = Client::whereRaw('LOWER(name) = ?', [strtolower($name)])
            ->where('id', '!=', $client->id)
            ->first();
        if ($duplicate) {
            return response()->json(['message' => 'Another client already has this name.'], 422);
        }

        $client->update(['name' => $name]);
        $client->projects()->update(['client' => $name]);

        return response()->json(['client' => $client]);
    }

    /**
     * Delete a client — refused (409) if any project still references it,
     * regardless of that project's status or who can currently see it, so
     * this check deliberately does NOT use Project::visible() scoping.
     */
    public function destroy(Request $request, Client $client)
    {
        $user = $request->user();
        if (!$user->isFounder()) {
            return response()->json(['message' => 'Only founders can manage clients'], 403);
        }

        if ($client->projects()->exists()) {
            return response()->json([
                'message' => 'This client is linked to one or more projects and cannot be deleted.',
            ], 409);
        }

        $client->delete();

        return response()->json(['message' => 'Client deleted.']);
    }
}
