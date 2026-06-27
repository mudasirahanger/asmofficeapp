<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$v = validator(['check_in' => '09:00'], ['check_in' => 'date_format:H:i']);
dd($v->errors()->toArray());
