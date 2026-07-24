<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Project;
use App\Models\Client;
use App\Models\Department;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClientControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_founder_sees_distinct_clients_with_counts()
    {
        $founder = User::factory()->create(['role' => 'founder']);

        $acme = Client::factory()->create(['name' => 'Acme Corp']);
        $globex = Client::factory()->create(['name' => 'Globex Inc']);

        Project::factory()->count(2)->create(['client' => 'Acme Corp', 'client_id' => $acme->id, 'status' => 'assigned']);
        Project::factory()->create(['client' => 'Acme Corp', 'client_id' => $acme->id, 'status' => 'completed']);
        Project::factory()->create(['client' => 'Globex Inc', 'client_id' => $globex->id, 'status' => 'billed']);
        // A brand-new client with no projects yet (e.g. just added via the
        // "Add Client" button) must still show up, not be hidden.
        Client::factory()->create(['name' => 'No Projects Yet']);

        Sanctum::actingAs($founder);

        $response = $this->getJson('/api/clients');

        $response->assertStatus(200)
                 ->assertJsonCount(3, 'clients');

        $emptyRow = collect($response->json('clients'))->firstWhere('name', 'No Projects Yet');
        $this->assertEquals(0, $emptyRow['total_projects']);

        $acmeRow = collect($response->json('clients'))->firstWhere('name', 'Acme Corp');
        $this->assertEquals(3, $acmeRow['total_projects']);
        $this->assertEquals(2, $acmeRow['active_projects']);
        $this->assertEquals(1, $acmeRow['completed_projects']);

        $globexRow = collect($response->json('clients'))->firstWhere('name', 'Globex Inc');
        $this->assertEquals(1, $globexRow['total_projects']);
        $this->assertEquals(1, $globexRow['billed_projects']);
    }

    public function test_head_only_sees_clients_from_own_department_projects()
    {
        $head = User::factory()->create(['role' => 'head']);
        $ownDept = Department::factory()->create();
        $otherDept = Department::factory()->create();
        $head->departments()->attach($ownDept);

        $ownClient = Client::factory()->create(['name' => 'Own Client']);
        $otherClient = Client::factory()->create(['name' => 'Other Client']);

        Project::factory()->create(['client' => 'Own Client', 'client_id' => $ownClient->id, 'department_id' => $ownDept->id]);
        Project::factory()->create(['client' => 'Other Client', 'client_id' => $otherClient->id, 'department_id' => $otherDept->id]);

        Sanctum::actingAs($head);

        $response = $this->getJson('/api/clients');

        $response->assertStatus(200)->assertJsonCount(1, 'clients');
        $this->assertEquals('Own Client', $response->json('clients.0.name'));
    }

    public function test_requires_authentication()
    {
        $response = $this->getJson('/api/clients');
        $response->assertStatus(401);
    }

    public function test_founder_can_create_a_client()
    {
        $founder = User::factory()->create(['role' => 'founder']);
        Sanctum::actingAs($founder);

        $response = $this->postJson('/api/clients', ['name' => 'New Client Co']);

        $response->assertStatus(201);
        $this->assertDatabaseHas('clients', ['name' => 'New Client Co']);
    }

    public function test_creating_a_duplicate_client_name_is_rejected_case_insensitively()
    {
        $founder = User::factory()->create(['role' => 'founder']);
        Client::factory()->create(['name' => 'Acme Corp']);
        Sanctum::actingAs($founder);

        $response = $this->postJson('/api/clients', ['name' => 'acme corp']);

        $response->assertStatus(422);
        $this->assertEquals(1, Client::where('name', 'Acme Corp')->count());
    }

    public function test_non_founder_cannot_create_a_client()
    {
        $head = User::factory()->create(['role' => 'head']);
        Sanctum::actingAs($head);

        $response = $this->postJson('/api/clients', ['name' => 'New Client Co']);

        $response->assertStatus(403);
    }

    public function test_founder_can_rename_a_client_and_it_cascades_to_linked_projects()
    {
        $founder = User::factory()->create(['role' => 'founder']);
        $client = Client::factory()->create(['name' => 'Acme Corp']);
        $project = Project::factory()->create(['client' => 'Acme Corp', 'client_id' => $client->id]);

        Sanctum::actingAs($founder);

        $response = $this->putJson("/api/clients/{$client->id}", ['name' => 'Acme Corporation']);

        $response->assertStatus(200);
        $this->assertDatabaseHas('clients', ['id' => $client->id, 'name' => 'Acme Corporation']);
        $this->assertDatabaseHas('projects', ['id' => $project->id, 'client' => 'Acme Corporation']);
    }

    public function test_deleting_a_client_linked_to_a_project_is_refused()
    {
        $founder = User::factory()->create(['role' => 'founder']);
        $client = Client::factory()->create(['name' => 'Acme Corp']);
        Project::factory()->create(['client' => 'Acme Corp', 'client_id' => $client->id]);

        Sanctum::actingAs($founder);

        $response = $this->deleteJson("/api/clients/{$client->id}");

        $response->assertStatus(409);
        $this->assertDatabaseHas('clients', ['id' => $client->id]);
    }

    public function test_deleting_a_client_with_no_projects_succeeds()
    {
        $founder = User::factory()->create(['role' => 'founder']);
        $client = Client::factory()->create(['name' => 'Unused Client']);

        Sanctum::actingAs($founder);

        $response = $this->deleteJson("/api/clients/{$client->id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted('clients', ['id' => $client->id]);
    }
}
