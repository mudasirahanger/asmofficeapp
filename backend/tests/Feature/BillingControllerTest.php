<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BillingControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_billing()
    {
        $accounts = User::factory()->create(['role' => 'accounts']);
        
        Project::factory()->count(2)->create(['status' => 'completed']);
        Project::factory()->count(3)->create(['status' => 'billed', 'billed_at' => now()]);

        Sanctum::actingAs($accounts);

        $response = $this->getJson('/api/billing');

        $response->assertStatus(200)
                 ->assertJsonCount(2, 'unbilled_projects')
                 ->assertJsonPath('overview.total_billed', 3);
    }
}
