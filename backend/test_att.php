<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Models\User::where('role', 'founder')->first();
$req = \Illuminate\Http\Request::create('/api/attendance', 'POST', [], [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
    'user_id' => $user->id,
    'date' => '2026-06-05',
    'status' => 'present',
    'check_in' => '09:00',
    'check_out' => '17:00'
]));
$req->setUserResolver(fn() => $user);

try {
    $res = app()->handle($req);
    echo "Status: " . $res->getStatusCode() . "\n";
    echo "Content: " . $res->getContent() . "\n";
} catch (\Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}
