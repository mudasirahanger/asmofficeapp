<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SyncService;
use Illuminate\Http\Request;

class SyncController extends Controller
{
    public function __construct(private SyncService $sync) {}

    public function push(Request $request)
    {
        $data = $request->validate([
            'device_id' => 'required|string',
            'actions'   => 'required|array',
        ]);

        $results = $this->sync->processPush(
            $request->user(),
            $data['device_id'],
            $data['actions']
        );

        return response()->json(['results' => $results]);
    }

    public function pull(Request $request)
    {
        $since = $request->since;

        if (!$since) {
            return $this->fullRefresh($request);
        }

        $data = $this->sync->pullSince($request->user(), $since);
        return response()->json($data);
    }

    public function fullRefresh(Request $request)
    {
        $data = $this->sync->fullRefresh($request->user());
        return response()->json($data);
    }
}
