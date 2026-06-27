<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\DeviceToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('username', $request->username)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'username' => ['Invalid username or password.'],
            ]);
        }

        // Revoke old tokens
        $user->tokens()->delete();

        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => $user->load('departments'),
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user()->load('departments'),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }

    public function registerDeviceToken(Request $request)
    {
        $request->validate([
            'device_id'       => 'required|string',
            'expo_push_token' => 'required|string',
            'platform'        => 'nullable|string|in:ios,android,web',
        ]);

        DeviceToken::updateOrCreate(
            [
                'user_id'   => $request->user()->id,
                'device_id' => $request->device_id,
            ],
            [
                'expo_push_token' => $request->expo_push_token,
                'platform'        => $request->platform ?? 'unknown',
                'last_seen_at'    => now(),
            ]
        );

        // Also update on user model for quick access
        $request->user()->update(['expo_push_token' => $request->expo_push_token]);

        return response()->json(['message' => 'Device token registered']);
    }
}
