<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\User;
use App\Models\Project;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if (!$user->isFounder()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $departments = Department::with(['head', 'members'])->get()->map(function ($dept) {
            $activeProjects = Project::where('department_id', $dept->id)
                ->whereIn('status', ['assigned', 'in_progress'])
                ->count();
            $totalProjects = Project::where('department_id', $dept->id)->count();

            return [
                'id'             => $dept->id,
                'slug'           => $dept->slug,
                'name'           => $dept->name,
                'color'          => $dept->color,
                'head'           => $dept->head,
                'members'        => $dept->members,
                'active_projects'=> $activeProjects,
                'total_projects' => $totalProjects,
            ];
        });

        return response()->json($departments);
    }

    public function departments(Request $request)
    {
        $departments = Department::with('head', 'members')->get();
        return response()->json($departments);
    }

    public function users(Request $request)
    {
        $users = User::with('departments')->get();
        return response()->json($users);
    }

    public function storeDepartment(Request $request)
    {
        if (!$request->user()->isFounder()) return response()->json(['message' => 'Unauthorized'], 403);
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'color' => 'nullable|string|max:50',
            'head_id' => 'nullable|exists:users,id',
        ]);
        
        $validated['slug'] = \Illuminate\Support\Str::slug($validated['name']);
        $department = Department::create($validated);
        
        if (!empty($validated['head_id'])) {
            $department->members()->syncWithoutDetaching([$validated['head_id']]);
        }
        
        return response()->json(['message' => 'Department created successfully', 'department' => $department], 201);
    }

    public function updateDepartment(Request $request, Department $department)
    {
        if (!$request->user()->isFounder()) return response()->json(['message' => 'Unauthorized'], 403);
        
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'color' => 'nullable|string|max:50',
            'head_id' => 'nullable|exists:users,id',
        ]);
        
        if (isset($validated['name'])) {
            $validated['slug'] = \Illuminate\Support\Str::slug($validated['name']);
        }
        
        $department->update($validated);
        
        if (!empty($validated['head_id'])) {
            $department->members()->syncWithoutDetaching([$validated['head_id']]);
        }

        return response()->json(['message' => 'Department updated successfully', 'department' => $department]);
    }

    public function destroyDepartment(Request $request, Department $department)
    {
        if (!$request->user()->isFounder()) return response()->json(['message' => 'Unauthorized'], 403);
        
        $department->delete();
        return response()->json(['message' => 'Department deleted successfully']);
    }

    public function storeUser(Request $request)
    {
        if (!$request->user()->isFounder()) return response()->json(['message' => 'Unauthorized'], 403);
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'required|in:founder,head,member,accounts',
            'position' => 'nullable|string|max:255',
            'department_ids' => 'nullable|array',
            'department_ids.*' => 'exists:departments,id',
        ]);
        
        // Generate a username from email
        $validated['username'] = explode('@', $validated['email'])[0];
        // Ensure username is unique
        $originalUsername = $validated['username'];
        $count = 1;
        while (User::where('username', $validated['username'])->exists()) {
            $validated['username'] = $originalUsername . $count;
            $count++;
        }

        $validated['password'] = \Illuminate\Support\Facades\Hash::make($validated['password']);
        
        $user = User::create(\Illuminate\Support\Arr::except($validated, ['department_ids']));
        
        if (isset($validated['department_ids'])) {
            $user->departments()->sync($validated['department_ids']);
        }
        
        return response()->json(['message' => 'User created successfully', 'user' => $user->load('departments')], 201);
    }

    public function updateUser(Request $request, User $user)
    {
        if (!$request->user()->isFounder()) return response()->json(['message' => 'Unauthorized'], 403);
        
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,'.$user->id,
            'password' => 'nullable|string|min:6',
            'role' => 'sometimes|in:founder,head,member,accounts',
            'position' => 'nullable|string|max:255',
            'department_ids' => 'nullable|array',
            'department_ids.*' => 'exists:departments,id',
        ]);
        
        if (isset($validated['email']) && $validated['email'] !== $user->email) {
            $validated['username'] = explode('@', $validated['email'])[0];
            $originalUsername = $validated['username'];
            $count = 1;
            while (User::where('username', $validated['username'])->where('id', '!=', $user->id)->exists()) {
                $validated['username'] = $originalUsername . $count;
                $count++;
            }
        }

        if (isset($validated['password'])) {
            $validated['password'] = \Illuminate\Support\Facades\Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }
        
        $user->update(\Illuminate\Support\Arr::except($validated, ['department_ids']));
        
        if (isset($validated['department_ids'])) {
            $user->departments()->sync($validated['department_ids']);
        }
        
        return response()->json(['message' => 'User updated successfully', 'user' => $user->load('departments')]);
    }

    public function destroyUser(Request $request, User $user)
    {
        if (!$request->user()->isFounder()) return response()->json(['message' => 'Unauthorized'], 403);
        
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Cannot delete yourself'], 400);
        }
        
        $user->delete();
        return response()->json(['message' => 'User deleted successfully']);
    }
}
