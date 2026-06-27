<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$project = \App\Models\Project::first();
$user = \App\Models\User::where('role', 'founder')->first();
$subUser = \App\Models\User::where('role', 'member')->first();

$request = \Illuminate\Http\Request::create("/api/projects/{$project->id}/sub-assign", 'PATCH', ['sub_assigned_to' => $subUser->id]);
$request->setUserResolver(function() use ($user) { return $user; });

$response = app()->handle($request);
echo "Status: " . $response->getStatusCode() . "\n";
echo "Content: " . $response->getContent() . "\n";
