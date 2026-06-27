<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\User;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $user    = $request->user();
        $date    = $request->date ?? now()->toDateString();

        $canManage = $user->isFounder() || $user->isAccounts() || $user->isHead() || in_array($user->role, ['hr', 'reception']);

        if ($canManage) {
            $attendance = Attendance::whereDate('date', $date)
                ->with('user', 'markedBy')
                ->get();

            $users = User::with('departments')->get();

            return response()->json([
                'date'       => $date,
                'attendance' => $attendance,
                'users'      => $users,
                'summary'    => [
                    'present'  => $attendance->where('status', 'present')->count(),
                    'absent'   => $attendance->where('status', 'absent')->count(),
                    'half_day' => $attendance->where('status', 'half_day')->count(),
                    'on_leave' => $attendance->where('status', 'on_leave')->count(),
                    'holiday'  => $attendance->where('status', 'holiday')->count(),
                ],
            ]);
        }

        // Member sees own history
        return $this->myHistory($request);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $canManage = $user->isFounder() || $user->isAccounts() || $user->isHead() || in_array($user->role, ['hr', 'reception']);
        if (!$canManage) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'user_id'   => 'required|exists:users,id',
            'date'      => 'required|date',
            'status'    => 'required|in:present,absent,half_day,on_leave,holiday',
            'check_in'  => 'nullable|date_format:H:i',
            'check_out' => 'nullable|date_format:H:i',
        ]);

        $attendance = Attendance::where('user_id', $data['user_id'])
            ->whereDate('date', $data['date'])
            ->first();

        if (!$attendance) {
            $attendance = new Attendance([
                'user_id' => $data['user_id'], 
                'date' => \Carbon\Carbon::parse($data['date'])->startOfDay()
            ]);
        }

        $attendance->fill(array_merge($data, [
            'marked_by'      => $user->id,
            'server_version' => ($attendance->server_version ?? 0) + 1,
        ]));
        $attendance->save();

        return response()->json($attendance->load('user', 'markedBy'), 201);
    }

    public function myHistory(Request $request)
    {
        $history = Attendance::where('user_id', $request->user()->id)
            ->orderByDesc('date')
            ->limit(60)
            ->get();

        return response()->json(['history' => $history]);
    }

    public function myCalendar(Request $request)
    {
        $request->validate([
            'month' => 'required|date_format:Y-m',
        ]);

        $startOfMonth = \Carbon\Carbon::createFromFormat('Y-m', $request->month)->startOfMonth();
        $endOfMonth = $startOfMonth->copy()->endOfMonth();

        $attendances = Attendance::where('user_id', $request->user()->id)
            ->whereBetween('date', [$startOfMonth, $endOfMonth])
            ->get();

        return response()->json(['attendance' => $attendances]);
    }

    public function myDay(Request $request)
    {
        $request->validate([
            'date' => 'required|date_format:Y-m-d',
        ]);

        $attendance = Attendance::where('user_id', $request->user()->id)
            ->whereDate('date', $request->date)
            ->first();

        return response()->json(['attendance' => $attendance]);
    }

    public function checkIn(Request $request)
    {
        $data = $request->validate([
            'date'      => 'required|date_format:Y-m-d',
            'latitude'  => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'accuracy'  => 'nullable|numeric',
            'platform'  => 'nullable|string',
            'device'    => 'nullable|string',
        ]);

        $today = now()->format('Y-m-d');
        if ($data['date'] !== $today) {
            return response()->json(['message' => 'You can only check in for today.'], 422);
        }

        $user = $request->user();

        $attendance = Attendance::where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        if ($attendance && $attendance->check_in_at) {
            return response()->json(['message' => 'You are already checked in today.'], 422);
        }

        if (!$attendance) {
            $attendance = new Attendance([
                'user_id' => $user->id,
                'date'    => \Carbon\Carbon::parse($today)->startOfDay(),
            ]);
        }

        $now = now();
        $attendance->fill([
            'status'                     => 'present',
            'check_in'                   => $now->format('H:i'), // backward compat
            'check_in_at'                => $now,
            'check_in_latitude'          => $data['latitude'] ?? null,
            'check_in_longitude'         => $data['longitude'] ?? null,
            'check_in_location_accuracy' => $data['accuracy'] ?? null,
            'check_in_platform'          => $data['platform'] ?? null,
            'check_in_device'            => $data['device'] ?? null,
            'server_version'             => ($attendance->server_version ?? 0) + 1,
        ]);
        $attendance->save();

        return response()->json(['message' => 'Checked in successfully', 'attendance' => $attendance]);
    }

    public function checkOut(Request $request)
    {
        $data = $request->validate([
            'date'      => 'required|date_format:Y-m-d',
            'latitude'  => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'accuracy'  => 'nullable|numeric',
            'platform'  => 'nullable|string',
            'device'    => 'nullable|string',
        ]);

        $today = now()->format('Y-m-d');
        if ($data['date'] !== $today) {
            return response()->json(['message' => 'You can only check out for today.'], 422);
        }

        $user = $request->user();

        $attendance = Attendance::where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        if (!$attendance || !$attendance->check_in_at) {
            return response()->json(['message' => 'You must check in before checking out.'], 422);
        }

        if ($attendance->check_out_at) {
            return response()->json(['message' => 'You are already checked out today.'], 422);
        }

        $now = now();
        $attendance->fill([
            'check_out'                   => $now->format('H:i'), // backward compat
            'check_out_at'                => $now,
            'check_out_latitude'          => $data['latitude'] ?? null,
            'check_out_longitude'         => $data['longitude'] ?? null,
            'check_out_location_accuracy' => $data['accuracy'] ?? null,
            'check_out_platform'          => $data['platform'] ?? null,
            'check_out_device'            => $data['device'] ?? null,
            'server_version'              => ($attendance->server_version ?? 0) + 1,
        ]);
        $attendance->save();

        return response()->json(['message' => 'Checked out successfully', 'attendance' => $attendance]);
    }
}
