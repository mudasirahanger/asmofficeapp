<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SettingsController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        
        // Allowed for Founder and Accounts
        if (!$user->isFounder() && !$user->isAccounts()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $settings = DB::table('settings')->pluck('value', 'key');
        return response()->json($settings);
    }

    public function update(Request $request)
    {
        $user = $request->user();

        // Allowed for Founder and Accounts
        if (!$user->isFounder() && !$user->isAccounts()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'settings' => 'required|array',
            'settings.*' => 'nullable|string',
        ]);

        foreach ($data['settings'] as $key => $value) {
            DB::table('settings')->updateOrInsert(
                ['key' => $key],
                ['value' => $value, 'updated_at' => now()]
            );
        }

        $settings = DB::table('settings')->pluck('value', 'key');
        return response()->json($settings);
    }
}
