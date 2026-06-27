<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\LeaveRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LeaveControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_leave()
    {
        $founder = User::factory()->create(['role' => 'founder']);
        LeaveRequest::factory()->count(2)->create();

        Sanctum::actingAs($founder);

        $response = $this->getJson('/api/leaves');

        $response->assertStatus(200);
        
        $this->assertCount(2, $response->json());
    }

    public function test_store_leave()
    {
        $member = User::factory()->create(['role' => 'member']);

        Sanctum::actingAs($member);

        $response = $this->postJson('/api/leaves', [
            'start_date' => now()->addDays(1)->toDateString(),
            'end_date' => now()->addDays(3)->toDateString(),
            'type' => 'sick',
            'reason' => 'Sick leave',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('leave_requests', [
            'user_id' => $member->id,
            'type' => 'sick',
            'status' => 'pending',
        ]);
    }

    public function test_approve_leave()
    {
        $founder = User::factory()->create(['role' => 'founder']);
        $leave = LeaveRequest::factory()->create(['status' => 'pending']);

        Sanctum::actingAs($founder);

        $response = $this->patchJson("/api/leaves/{$leave->id}/approve");

        $response->assertStatus(200);
        $this->assertDatabaseHas('leave_requests', [
            'id' => $leave->id,
            'status' => 'approved',
            'approved_by' => $founder->id,
        ]);
    }

    public function test_reject_leave()
    {
        $founder = User::factory()->create(['role' => 'founder']);
        $leave = LeaveRequest::factory()->create(['status' => 'pending']);

        Sanctum::actingAs($founder);

        $response = $this->patchJson("/api/leaves/{$leave->id}/reject");

        $response->assertStatus(200);
        $this->assertDatabaseHas('leave_requests', [
            'id' => $leave->id,
            'status' => 'rejected',
        ]);
    }

    public function test_cancel_leave()
    {
        $member = User::factory()->create(['role' => 'member']);
        $leave = LeaveRequest::factory()->create(['user_id' => $member->id, 'status' => 'pending']);

        Sanctum::actingAs($member);

        $response = $this->patchJson("/api/leaves/{$leave->id}/cancel");

        $response->assertStatus(200);
        $this->assertDatabaseHas('leave_requests', [
            'id' => $leave->id,
            'status' => 'cancelled',
        ]);
    }
}
