<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class LeaveController extends Controller
{
    public function __construct(private NotificationService $notifier) {}

    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->isFounder() || in_array($user->role, ['hr', 'accounts', 'reception'])) {
            $leaves = LeaveRequest::with('user', 'approvedBy')->orderByDesc('applied_at')->get();
        } elseif ($user->isHead()) {
            $directReportIds = User::where('reporting_to', $user->id)->pluck('id');
            $leaves = LeaveRequest::where(function ($q) use ($user, $directReportIds) {
                $q->where('user_id', $user->id)->orWhereIn('user_id', $directReportIds);
            })->with('user', 'approvedBy')->orderByDesc('applied_at')->get();
        } else {
            $leaves = LeaveRequest::where('user_id', $user->id)
                ->with('user', 'approvedBy')
                ->orderByDesc('applied_at')
                ->get();
        }

        return response()->json($leaves);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after_or_equal:start_date',
            'type'       => 'required|in:casual,sick,annual,unpaid',
            'reason'     => 'required|string|min:5',
        ]);

        $leave = LeaveRequest::create(array_merge($data, [
            'user_id'        => $request->user()->id,
            'status'         => 'pending',
            'applied_at'     => now(),
            'server_version' => 1,
        ]));

        $leave->load('user');

        $this->notifier->leaveSubmitted($leave);

        return response()->json($leave, 201);
    }

    public function approve(Request $request, LeaveRequest $leave)
    {
        $user = $request->user();

        if (!$user->isFounder() && !$user->isHead() && !in_array($user->role, ['hr', 'accounts', 'reception'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Head can only approve direct reports
        if ($user->isHead()) {
            $applicant = User::find($leave->user_id);
            if ($applicant?->reporting_to !== $user->id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        if ($leave->status !== 'pending') {
            return response()->json(['message' => 'Leave already decided'], 422);
        }

        $leave->update([
            'status'         => 'approved',
            'approved_by'    => $user->id,
            'server_version' => $leave->server_version + 1,
        ]);

        $this->notifier->leaveDecided($leave->fresh());

        return response()->json($leave->fresh('user', 'approvedBy'));
    }

    public function reject(Request $request, LeaveRequest $leave)
    {
        $user = $request->user();

        if (!$user->isFounder() && !$user->isHead() && !in_array($user->role, ['hr', 'accounts', 'reception'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($user->isHead()) {
            $applicant = User::find($leave->user_id);
            if ($applicant?->reporting_to !== $user->id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        if ($leave->status !== 'pending') {
            return response()->json(['message' => 'Leave already decided'], 422);
        }

        $leave->update([
            'status'         => 'rejected',
            'approved_by'    => $user->id,
            'server_version' => $leave->server_version + 1,
        ]);

        $this->notifier->leaveDecided($leave->fresh());

        return response()->json($leave->fresh('user', 'approvedBy'));
    }

    public function cancel(Request $request, LeaveRequest $leave)
    {
        $user = $request->user();

        $canManage = $user->isFounder() || in_array($user->role, ['hr', 'accounts', 'reception']);
        if ($user->isHead()) {
            $applicant = User::find($leave->user_id);
            if ($applicant?->reporting_to === $user->id) {
                $canManage = true;
            }
        }

        if (!$canManage && $user->id !== $leave->user_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $leave->update([
            'status'         => 'cancelled',
            'approved_by'    => $canManage ? $user->id : $leave->approved_by,
            'server_version' => $leave->server_version + 1,
        ]);

        $this->notifier->leaveDecided($leave->fresh());

        return response()->json($leave->fresh('user', 'approvedBy'));
    }
}
