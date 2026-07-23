<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ProgressController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\LeaveController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\SyncController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\ClientController;
use Illuminate\Support\Facades\Route;

// ============================================================
// Public Auth Routes & Whitelist
// ============================================================
// Rate-limited separately from the authenticated group below: these are the
// only unauthenticated write endpoints, so they are the primary brute-force
// / abuse targets (login credential guessing, whitelist IP spoofing).
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');

use App\Http\Controllers\Api\OfficeWhitelistController;
Route::post('/whitelist-office', [OfficeWhitelistController::class, 'updateIp'])->middleware('throttle:6,1');

// ============================================================
// Protected Routes (require Sanctum token)
// ============================================================
Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {

    // Auth
    Route::get('/me',           [AuthController::class, 'me']);
    Route::post('/logout',      [AuthController::class, 'logout']);
    Route::post('/device-token',[AuthController::class, 'registerDeviceToken']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Projects
    Route::get   ('/projects',                      [ProjectController::class, 'index']);
    Route::post  ('/projects',                      [ProjectController::class, 'store']);
    Route::get   ('/projects/{project}',            [ProjectController::class, 'show']);
    Route::put   ('/projects/{project}',            [ProjectController::class, 'update']);
    Route::patch ('/projects/{project}/complete',   [ProjectController::class, 'complete']);
    Route::patch ('/projects/{project}/billed',     [ProjectController::class, 'markBilled']);
    Route::patch ('/projects/{project}/deadline',   [ProjectController::class, 'changeDeadline']);
    Route::patch ('/projects/{project}/sub-assign', [ProjectController::class, 'subAssign']);

    // Clients (derived from distinct Project.client values — no separate table)
    Route::get ('/clients', [ClientController::class, 'index']);

    // Progress Updates
    Route::get  ('/projects/{project}/progress', [ProgressController::class, 'index']);
    Route::post ('/projects/{project}/progress', [ProgressController::class, 'store']);

    // Notifications
    Route::get   ('/notifications',                          [NotificationController::class, 'index']);
    Route::patch ('/notifications/{notification}/read',      [NotificationController::class, 'markRead']);
    Route::patch ('/notifications/read-all',                 [NotificationController::class, 'markAllRead']);

    // Attendance
    Route::get  ('/attendance',            [AttendanceController::class, 'index']);
    Route::post ('/attendance',            [AttendanceController::class, 'store']);
    Route::get  ('/attendance/my-history', [AttendanceController::class, 'myHistory']);
    Route::get  ('/attendance/my-calendar',[AttendanceController::class, 'myCalendar']);
    Route::get  ('/attendance/my-day',     [AttendanceController::class, 'myDay']);
    Route::post ('/attendance/check-in',   [AttendanceController::class, 'checkIn']);
    Route::post ('/attendance/check-out',  [AttendanceController::class, 'checkOut']);

    // Leaves
    Route::get   ('/leaves',                    [LeaveController::class, 'index']);
    Route::post  ('/leaves',                    [LeaveController::class, 'store']);
    Route::patch ('/leaves/{leave}/approve',    [LeaveController::class, 'approve']);
    Route::patch ('/leaves/{leave}/reject',     [LeaveController::class, 'reject']);
    Route::patch ('/leaves/{leave}/cancel',     [LeaveController::class, 'cancel']);

    // Team
    Route::get ('/team',        [TeamController::class, 'index']);
    Route::get ('/departments', [TeamController::class, 'departments']);
    Route::post('/departments', [TeamController::class, 'storeDepartment']);
    Route::put ('/departments/{department}', [TeamController::class, 'updateDepartment']);
    Route::delete('/departments/{department}', [TeamController::class, 'destroyDepartment']);

    Route::get ('/users',       [TeamController::class, 'users']);
    Route::post('/users',       [TeamController::class, 'storeUser']);
    Route::put ('/users/{user}', [TeamController::class, 'updateUser']);
    Route::delete('/users/{user}', [TeamController::class, 'destroyUser']);

    // Billing
    Route::get ('/billing', [BillingController::class, 'index']);

    // Settings
    Route::get ('/settings', [SettingsController::class, 'index']);
    Route::post('/settings', [SettingsController::class, 'update']);

    // Analytics
    Route::get ('/analytics', [AnalyticsController::class, 'index']);

    // Sync (offline support)
    Route::post ('/sync/push',         [SyncController::class, 'push']);
    Route::get  ('/sync/pull',         [SyncController::class, 'pull']);
    Route::post ('/sync/full-refresh', [SyncController::class, 'fullRefresh']);
});
