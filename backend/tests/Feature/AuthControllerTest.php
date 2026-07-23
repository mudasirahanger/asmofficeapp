<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_success()
    {
        $user = User::factory()->create([
            'username' => 'testuser',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/login', [
            'username' => 'testuser',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['token', 'user']);
    }

    public function test_login_failure()
    {
        $response = $this->postJson('/api/login', [
            'username' => 'wrong',
            'password' => 'wrong',
        ]);

        $response->assertStatus(422);
    }

    public function test_me()
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/me');

        $response->assertStatus(200)
                 ->assertJsonPath('user.id', $user->id);
    }

    public function test_logout()
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)->postJson('/api/logout');

        $response->assertStatus(200);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_login_is_rate_limited_after_repeated_failures()
    {
        // Regression test for D-2: /login previously had no throttle middleware,
        // allowing unlimited credential-guessing attempts.
        for ($i = 0; $i < 6; $i++) {
            $this->postJson('/api/login', [
                'username' => 'nobody',
                'password' => 'wrong',
            ])->assertStatus(422);
        }

        $response = $this->postJson('/api/login', [
            'username' => 'nobody',
            'password' => 'wrong',
        ]);

        $response->assertStatus(429);
    }

    public function test_register_device_token()
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/device-token', [
            'device_id' => 'device123',
            'expo_push_token' => 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
            'platform' => 'ios',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('device_tokens', [
            'user_id' => $user->id,
            'device_id' => 'device123',
            'expo_push_token' => 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        ]);
    }
}
