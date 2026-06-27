<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class OfficeWhitelistController extends Controller
{
    public function updateIp(Request $request)
    {
        // 1. Check Secret Key to prevent unauthorized access
        $secret = $request->header('X-Office-Secret');
        if (!$secret || $secret !== env('OFFICE_WHITELIST_SECRET', 'SuperSecretKey123!')) {
            Log::warning('Unauthorized IP whitelist attempt', ['ip' => $request->ip()]);
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $ip = $request->ip();

        // 2. Validate IP via ip-api.com to ensure it's from Reliance Jio in J&K
        try {
            $response = Http::timeout(5)->get("http://ip-api.com/json/{$ip}?fields=status,regionName,isp,as");
            
            if ($response->successful()) {
                $data = $response->json();
                
                if ($data['status'] !== 'success') {
                    return response()->json(['error' => 'Could not verify IP'], 400);
                }

                // Check ISP and Region constraints
                $isRelianceJio = str_contains(strtolower($data['isp'] ?? ''), 'reliance jio') || 
                                 str_contains(strtolower($data['as'] ?? ''), 'as55836');
                $isJammuKashmir = str_contains(strtolower($data['regionName'] ?? ''), 'jammu');

                if (!$isRelianceJio || !$isJammuKashmir) {
                    Log::warning('IP Whitelist rejected due to Geo/ISP mismatch', ['ip' => $ip, 'data' => $data]);
                    return response()->json(['error' => 'IP does not meet geographical or ISP requirements.'], 403);
                }

                // 3. Save the IP to a local file for the root cronjob to read
                Storage::disk('local')->put('imunify360_office_ip.txt', $ip);
                
                return response()->json([
                    'message' => 'IP validated and queued for whitelisting.',
                    'ip' => $ip
                ]);
            }
        } catch (\Exception $e) {
            Log::error('IP Whitelist check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Verification service unavailable'], 500);
        }

        return response()->json(['error' => 'Unknown error'], 500);
    }
}
