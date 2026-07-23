<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Project;
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

        Project::factory()->count(2)->create(['client' => 'Acme Corp', 'status' => 'assigned']);
        Project::factory()->create(['client' => 'Acme Corp', 'status' => 'completed']);
        Project::factory()->create(['client' => 'Globex Inc', 'status' => 'billed']);
        Project::factory()->create(['client' => null]); // no client — must be excluded
        Project::factory()->create(['client' => '']); // empty string — must be excluded

        Sanctum::actingAs($founder);

        $response = $this->getJson('/api/clients');

        $response->assertStatus(200)
                 ->assertJsonCount(2, 'clients');

        $acme = collect($response->json('clients'))->firstWhere('name', 'Acme Corp');
        $this->assertEquals(3, $acme['total_projects']);
        $this->assertEquals(2, $acme['active_projects']);
        $this->assertEquals(1, $acme['completed_projects']);

        $globex = collect($response->json('clients'))->firstWhere('name', 'Globex Inc');
        $this->assertEquals(1, $globex['total_projects']);
        $this->assertEquals(1, $globex['billed_projects']);
    }

    public function test_head_only_sees_clients_from_own_department_projects()
    {
        $head = User::factory()->create(['role' => 'head']);
        $ownDept = Department::factory()->create();
        $otherDept = Department::factory()->create();
        $head->departments()->attach($ownDept);

        Project::factory()->create(['client' => 'Own Client', 'department_id' => $ownDept->id]);
        Project::factory()->create(['client' => 'Other Client', 'department_id' => $otherDept->id]);

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
}
