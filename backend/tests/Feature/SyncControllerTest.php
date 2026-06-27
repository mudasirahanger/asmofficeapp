<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SyncControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_push()
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/sync/push', [
            'device_id' => 'device123',
            'actions' => [['type' => 'test', 'data' => []]],
        ]);

        $response->assertStatus(200);
    }

    public function test_pull()
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/sync/pull');

        $response->assertStatus(200);
    }

    public function test_full_refresh()
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/sync/full-refresh');

        $response->assertStatus(200);
    }
}
