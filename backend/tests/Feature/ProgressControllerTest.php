<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Project;
use App\Models\ProgressUpdate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProgressControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_progress()
    {
        $user = User::factory()->create(['role' => 'founder']);
        $project = Project::factory()->create();
        ProgressUpdate::factory()->count(3)->create(['project_id' => $project->id]);

        Sanctum::actingAs($user);

        $response = $this->getJson("/api/projects/{$project->id}/progress");

        $response->assertStatus(200)
                 ->assertJsonCount(3);
    }

    public function test_index_progress_unauthorized()
    {
        $user = User::factory()->create(['role' => 'member']);
        $project = Project::factory()->create(['assigned_to' => User::factory()->create()->id]); // Someone else's project
        ProgressUpdate::factory()->create(['project_id' => $project->id]);

        Sanctum::actingAs($user);

        $response = $this->getJson("/api/projects/{$project->id}/progress");

        $response->assertStatus(403);
    }

    public function test_store_progress()
    {
        $user = User::factory()->create(['role' => 'member']);
        $project = Project::factory()->create(['assigned_to' => $user->id]);

        Sanctum::actingAs($user);

        $response = $this->postJson("/api/projects/{$project->id}/progress", [
            'percentage' => 50,
            'text' => 'Halfway there',
            'progress_date' => now()->toDateString(),
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('progress_updates', [
            'project_id' => $project->id,
            'percentage' => 50,
        ]);
    }
}
