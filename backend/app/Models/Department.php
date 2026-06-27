<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Department extends Model
{
    use HasFactory;

    protected $fillable = ['slug', 'name', 'head_id', 'color'];

    public function head()
    {
        return $this->belongsTo(User::class, 'head_id');
    }

    public function members()
    {
        return $this->belongsToMany(User::class, 'department_user');
    }

    public function projects()
    {
        return $this->hasMany(Project::class);
    }
}
