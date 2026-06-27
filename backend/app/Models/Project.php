<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title',
        'description',
        'client',
        'department_id',
        'assigned_to',
        'sub_assigned_to',
        'created_by',
        'deadline',
        'priority',
        'status',
        'notes',
        'completed_at',
        'billed_at',
        'server_version',
        'invoice_data',
    ];

    protected $casts = [
        'deadline'        => 'date',
        'completed_at'    => 'datetime',
        'billed_at'       => 'datetime',
        'assigned_to'     => 'integer',
        'sub_assigned_to' => 'integer',
        'created_by'      => 'integer',
        'department_id'   => 'integer',
        'invoice_data'    => 'array',
    ];

    // Relationships
    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function assignedTo()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function subAssignedTo()
    {
        return $this->belongsTo(User::class, 'sub_assigned_to');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function progressUpdates()
    {
        return $this->hasMany(ProgressUpdate::class)->orderByDesc('created_at');
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    // Helpers
    public function isOverdue(): bool
    {
        if (!$this->deadline) return false;
        if (in_array($this->status, ['completed', 'billed'])) return false;
        return $this->deadline->isPast();
    }

    public function getLatestProgressPercentage(): int
    {
        return $this->progressUpdates()->first()?->percentage ?? 0;
    }

    public function scopeVisible($query, User $user)
    {
        if ($user->isFounder()) {
            return $query;
        }

        $deptIds = $user->getDepartmentIds();

        return $query->where(function ($q) use ($user, $deptIds) {
            $q->where('assigned_to', $user->id)
              ->orWhere('sub_assigned_to', $user->id)
              ->orWhereIn('department_id', $deptIds);

            if ($user->isAccounts()) {
                $q->orWhereIn('status', ['completed', 'billed']);
            }
        });
    }
}
