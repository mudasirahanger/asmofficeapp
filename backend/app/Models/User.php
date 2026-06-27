<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'role',
        'position',
        'reporting_to',
        'expo_push_token',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    // Relationships
    public function departments()
    {
        return $this->belongsToMany(Department::class, 'department_user');
    }

    public function reportingTo()
    {
        return $this->belongsTo(User::class, 'reporting_to');
    }

    public function directReports()
    {
        return $this->hasMany(User::class, 'reporting_to');
    }

    public function projectsCreated()
    {
        return $this->hasMany(Project::class, 'created_by');
    }

    public function projectsAssigned()
    {
        return $this->hasMany(Project::class, 'assigned_to');
    }

    public function projectsSubAssigned()
    {
        return $this->hasMany(Project::class, 'sub_assigned_to');
    }

    public function progressUpdates()
    {
        return $this->hasMany(ProgressUpdate::class);
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class)->orderByDesc('created_at');
    }

    public function attendance()
    {
        return $this->hasMany(Attendance::class);
    }

    public function leaveRequests()
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function deviceTokens()
    {
        return $this->hasMany(DeviceToken::class);
    }

    // Helpers
    public function isFounder(): bool
    {
        return $this->role === 'founder';
    }

    public function isHead(): bool
    {
        return $this->role === 'head';
    }

    public function isMember(): bool
    {
        return $this->role === 'member';
    }

    public function isAccounts(): bool
    {
        return $this->role === 'accounts';
    }

    public function getDepartmentIds(): array
    {
        $ids = $this->departments->pluck('id')->toArray();
        $headDeptIds = Department::where('head_id', $this->id)->pluck('id')->toArray();
        return array_unique(array_merge($ids, $headDeptIds));
    }

    public function getDepartmentSlugs(): array
    {
        $slugs = $this->departments->pluck('slug')->toArray();
        $headDeptSlugs = Department::where('head_id', $this->id)->pluck('slug')->toArray();
        return array_unique(array_merge($slugs, $headDeptSlugs));
    }
}
