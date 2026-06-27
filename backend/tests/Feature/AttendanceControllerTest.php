<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Attendance;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AttendanceControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_attendance_founder()
    {
        $founder = User::factory()->create(['role' => 'founder']);
        Attendance::factory()->count(3)->create(['date' => now()->toDateString()]);

        Sanctum::actingAs($founder);

        $date = now()->toDateString();
        $response = $this->getJson("/api/attendance?date={$date}");

        $response->assertStatus(200)
                 ->assertJsonCount(3, 'attendance');
    }

    public function test_store_attendance()
    {
        $founder = User::factory()->create(['role' => 'founder']);
        $member = User::factory()->create(['role' => 'member']);

        Sanctum::actingAs($founder);

        $date = now()->toDateString();
        $response = $this->postJson("/api/attendance?date={$date}", [
            'user_id' => $member->id,
            'date' => now()->toDateString(),
            'status' => 'present',
            'check_in' => '09:00',
            'check_out' => '18:00',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('attendance', [
            'user_id' => $member->id,
            'status' => 'present',
        ]);
    }

    public function test_my_history()
    {
        $member = User::factory()->create(['role' => 'member']);
        Attendance::factory()->create(['user_id' => $member->id]);
        Attendance::factory()->create(); // Someone else

        Sanctum::actingAs($member);

        $response = $this->getJson('/api/attendance/my-history');

        $response->assertStatus(200)
                 ->assertJsonCount(1, 'history');
    }

    public function test_check_in()
    {
        $member = User::factory()->create(['role' => 'member']);

        Sanctum::actingAs($member);

        $today = now()->format('Y-m-d');
        $response = $this->postJson('/api/attendance/check-in', [
            'date' => $today,
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('attendance', [
            'user_id' => $member->id,
            'status' => 'present',
        ]);
    }

    public function test_check_out()
    {
        $member = User::factory()->create(['role' => 'member']);
        $today = now()->format('Y-m-d');
        Attendance::factory()->create([
            'user_id' => $member->id,
            'date' => \Carbon\Carbon::parse($today)->startOfDay(),
            'check_in_at' => now()->subHours(4),
        ]);

        Sanctum::actingAs($member);

        $response = $this->postJson('/api/attendance/check-out', [
            'date' => $today,
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('attendance', [
            'user_id' => $member->id,
        ]);
        $this->assertNotNull(Attendance::where('user_id', $member->id)->first()->check_out_at);
    }
}
