<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Project;
use App\Models\Department;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProjectControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_founder_can_see_all_projects()
    {
        $founder = User::factory()->create(['role' => 'founder']);
        Project::factory()->count(3)->create();

        Sanctum::actingAs($founder);

        $response = $this->getJson('/api/projects');

        $response->assertStatus(200)
                 ->assertJsonCount(3, 'data');
    }

    public function test_head_can_only_see_own_department_projects()
    {
        $head = User::factory()->create(['role' => 'head']);
        $dept1 = Department::factory()->create();
        $dept2 = Department::factory()->create();
        
        $head->departments()->attach($dept1);

        Project::factory()->count(2)->create(['department_id' => $dept1->id]);
        Project::factory()->count(1)->create(['department_id' => $dept2->id]);

        Sanctum::actingAs($head);

        $response = $this->getJson('/api/projects');

        $response->assertStatus(200)
                 ->assertJsonCount(2, 'data');
    }

    public function test_member_can_only_see_assigned_projects()
    {
        $member = User::factory()->create(['role' => 'member']);
        
        Project::factory()->create(['assigned_to' => $member->id]);
        Project::factory()->create(['sub_assigned_to' => $member->id]);
        Project::factory()->create(); // Not assigned

        Sanctum::actingAs($member);

        $response = $this->getJson('/api/projects');

        $response->assertStatus(200)
                 ->assertJsonCount(2, 'data');
    }

    public function test_accounts_can_see_billed_projects()
    {
        $accounts = User::factory()->create(['role' => 'accounts']);
        
        Project::factory()->create(['status' => 'billed']);
        Project::factory()->create(['status' => 'completed']); // accounts can see completed and billed
        Project::factory()->create(['status' => 'assigned']);

        Sanctum::actingAs($accounts);

        $response = $this->getJson('/api/projects');

        $response->assertStatus(200)
                 ->assertJsonCount(2, 'data');
    }

    public function test_store_project()
    {
        $user = User::factory()->create(['role' => 'founder']);
        $dept = Department::factory()->create();

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/projects', [
            'title' => 'New Project',
            'client' => 'Acme Corp',
            'department_id' => $dept->id,
            'description' => 'A great project',
            'deadline' => now()->addDays(7)->toDateString(),
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('projects', [
            'title' => 'New Project',
            'created_by' => $user->id,
        ]);

        // Client::resolveForProject find-or-creates a Client from the raw
        // `client` string and links it via client_id.
        $project = \App\Models\Project::where('title', 'New Project')->firstOrFail();
        $this->assertNotNull($project->client_id);
        $this->assertDatabaseHas('clients', ['id' => $project->client_id, 'name' => 'Acme Corp']);
    }

    public function test_creating_a_second_project_with_a_differently_cased_client_name_reuses_the_same_client()
    {
        $user = User::factory()->create(['role' => 'founder']);
        $dept = Department::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/projects', [
            'title' => 'First', 'client' => 'Acme Corp', 'department_id' => $dept->id,
            'deadline' => now()->addDays(7)->toDateString(),
        ])->assertStatus(201);

        $this->postJson('/api/projects', [
            'title' => 'Second', 'client' => '  acme corp  ', 'department_id' => $dept->id,
            'deadline' => now()->addDays(7)->toDateString(),
        ])->assertStatus(201);

        $this->assertEquals(1, \App\Models\Client::count());
        $first = \App\Models\Project::where('title', 'First')->firstOrFail();
        $second = \App\Models\Project::where('title', 'Second')->firstOrFail();
        $this->assertEquals($first->client_id, $second->client_id);
        // Canonical casing from the first-created Client wins.
        $this->assertEquals('Acme Corp', $second->client);
    }

    public function test_mark_billed()
    {
        $founder = User::factory()->create(['role' => 'founder']);
        $project = Project::factory()->create(['status' => 'completed']);

        Sanctum::actingAs($founder);

        $response = $this->patchJson("/api/projects/{$project->id}/billed");

        $response->assertStatus(200);
        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'status' => 'billed',
        ]);
    }

    public function test_show_project()
    {
        $member = User::factory()->create(['role' => 'member']);
        $project = Project::factory()->create(['assigned_to' => $member->id]);

        Sanctum::actingAs($member);

        $response = $this->getJson("/api/projects/{$project->id}");

        $response->assertStatus(200)
                 ->assertJsonPath('project.id', $project->id);
    }

    public function test_show_project_unauthorized()
    {
        $member = User::factory()->create(['role' => 'member']);
        $project = Project::factory()->create(['assigned_to' => User::factory()->create()->id]);

        Sanctum::actingAs($member);

        $response = $this->getJson("/api/projects/{$project->id}");

        $response->assertStatus(403);
    }

    public function test_update_project()
    {
        $founder = User::factory()->create(['role' => 'founder']);
        $project = Project::factory()->create(['title' => 'Old Title']);

        Sanctum::actingAs($founder);

        $response = $this->putJson("/api/projects/{$project->id}", [
            'title' => 'Updated Title'
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'title' => 'Updated Title',
        ]);
    }

    public function test_complete_project()
    {
        $member = User::factory()->create(['role' => 'member']);
        $project = Project::factory()->create(['status' => 'assigned', 'assigned_to' => $member->id]);

        Sanctum::actingAs($member);

        $response = $this->patchJson("/api/projects/{$project->id}/complete");

        $response->assertStatus(200);
        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'status' => 'completed',
        ]);
    }

    public function test_change_deadline()
    {
        $founder = User::factory()->create(['role' => 'founder']);
        $project = Project::factory()->create();

        Sanctum::actingAs($founder);

        $newDeadline = now()->addDays(10)->toDateString();
        $response = $this->patchJson("/api/projects/{$project->id}/deadline", [
            'deadline' => $newDeadline
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'deadline' => now()->addDays(10)->startOfDay()->format('Y-m-d H:i:s'),
        ]);
    }

    public function test_sub_assign()
    {
        $founder = User::factory()->create(['role' => 'founder']);
        $project = Project::factory()->create();
        $subUser = User::factory()->create();

        Sanctum::actingAs($founder);

        $response = $this->patchJson("/api/projects/{$project->id}/sub-assign", [
            'sub_assigned_to' => $subUser->id
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'sub_assigned_to' => $subUser->id,
        ]);
    }
}
