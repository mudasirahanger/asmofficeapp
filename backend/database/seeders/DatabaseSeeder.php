<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Department;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ============================================================
        // Create Users (without departments yet)
        // ============================================================
        $users = [
            ['id'=>1,  'name'=>'Tariq',    'username'=>'tariq',    'password'=>'tariq123',    'role'=>'founder',  'position'=>'Founder / Director',                       'reporting_to'=>null],
            ['id'=>2,  'name'=>'Wajahat',  'username'=>'wajahat',  'password'=>'wajahat123',  'role'=>'founder',  'position'=>'Founder / Director',                       'reporting_to'=>null],
            ['id'=>3,  'name'=>'Sameer',   'username'=>'sameer',   'password'=>'sameer123',   'role'=>'head',     'position'=>'Head of Video Production',                 'reporting_to'=>1],
            ['id'=>4,  'name'=>'Bilquees', 'username'=>'bilquees', 'password'=>'bilquees123', 'role'=>'head',     'position'=>'Head of Web & Digital',                    'reporting_to'=>1],
            ['id'=>5,  'name'=>'Faisul',   'username'=>'faisul',   'password'=>'faisul123',   'role'=>'head',     'position'=>'Research & Script / KI Editorial Head',    'reporting_to'=>3],
            ['id'=>6,  'name'=>'Tabish',   'username'=>'tabish',   'password'=>'tabish123',   'role'=>'head',     'position'=>'Social Media & E-Commerce Head',           'reporting_to'=>1],
            ['id'=>7,  'name'=>'Amir',     'username'=>'amir',     'password'=>'amir123',     'role'=>'head',     'position'=>'Operations Head',                          'reporting_to'=>1],
            ['id'=>8,  'name'=>'Zafar',    'username'=>'zafar',    'password'=>'zafar123',     'role'=>'head',     'position'=>'Shoot Division Head',                      'reporting_to'=>3],
            ['id'=>9,  'name'=>'Rashid',   'username'=>'rashid',   'password'=>'rashid123',   'role'=>'member',   'position'=>'Shoots, Drone & Studio Head',              'reporting_to'=>8],
            ['id'=>10, 'name'=>'Abid',     'username'=>'abid',     'password'=>'abid123',     'role'=>'member',   'position'=>'Creative Director & Client Coordinator',   'reporting_to'=>3],
            ['id'=>11, 'name'=>'Danish',   'username'=>'danish',   'password'=>'danish123',   'role'=>'member',   'position'=>'Social Shoots',                            'reporting_to'=>8],
            ['id'=>12, 'name'=>'Asif',     'username'=>'asif',     'password'=>'asif123',     'role'=>'member',   'position'=>'Social Shoots',                            'reporting_to'=>8],
            ['id'=>13, 'name'=>'Suneem',   'username'=>'suneem',   'password'=>'suneem123',   'role'=>'member',   'position'=>'Video Editor',                             'reporting_to'=>3],
            ['id'=>14, 'name'=>'Mohsin',   'username'=>'mohsin',   'password'=>'mohsin123',   'role'=>'member',   'position'=>'Video Editor',                             'reporting_to'=>3],
            ['id'=>15, 'name'=>'Muntazir', 'username'=>'muntazir', 'password'=>'muntazir123', 'role'=>'member',   'position'=>'Designer',                                 'reporting_to'=>5],
            ['id'=>16, 'name'=>'Irfan',    'username'=>'irfan',    'password'=>'irfan123',    'role'=>'member',   'position'=>'Operations & Compliance (Magazine)',        'reporting_to'=>5],
            ['id'=>17, 'name'=>'Moin',     'username'=>'moin',     'password'=>'moin123',     'role'=>'member',   'position'=>'Execution & Design',                       'reporting_to'=>6],
            ['id'=>18, 'name'=>'Mudasir',  'username'=>'mudasir',  'password'=>'mudasir123',  'role'=>'member',   'position'=>'Apps & Software Support',                  'reporting_to'=>4],
            ['id'=>19, 'name'=>'Bisma',    'username'=>'bisma',    'password'=>'bisma123',    'role'=>'accounts', 'position'=>'HR, Accounts & Reception',                 'reporting_to'=>7],
        ];

        foreach ($users as $data) {
            User::create([
                'id'           => $data['id'],
                'name'         => $data['name'],
                'username'     => $data['username'],
                'password'     => Hash::make($data['password']),
                'role'         => $data['role'],
                'position'     => $data['position'],
                'reporting_to' => $data['reporting_to'],
            ]);
        }

        // ============================================================
        // Create Departments
        // ============================================================
        $depts = [
            ['id'=>1, 'slug'=>'video',           'name'=>'Video Production',           'head_id'=>3,  'color'=>'blue'],
            ['id'=>2, 'slug'=>'web',             'name'=>'Web & Digital',              'head_id'=>4,  'color'=>'emerald'],
            ['id'=>3, 'slug'=>'kashmir_impulse', 'name'=>'Kashmir Impulse',            'head_id'=>5,  'color'=>'violet'],
            ['id'=>4, 'slug'=>'social',          'name'=>'Social Media',               'head_id'=>6,  'color'=>'pink'],
            ['id'=>5, 'slug'=>'ecommerce',       'name'=>'E-Commerce (Kashmir Brand)', 'head_id'=>6,  'color'=>'amber'],
            ['id'=>6, 'slug'=>'operations',      'name'=>'Operations & Admin',         'head_id'=>7,  'color'=>'slate'],
        ];

        foreach ($depts as $d) {
            Department::create($d);
        }

        // ============================================================
        // Attach users to departments
        // ============================================================
        $userDepts = [
            3  => [1],          // Sameer -> video
            4  => [2],          // Bilquees -> web
            5  => [1, 3],       // Faisul -> video, kashmir_impulse
            6  => [4, 5],       // Tabish -> social, ecommerce
            7  => [6],          // Amir -> operations
            8  => [1],          // Zafar -> video
            9  => [1],          // Rashid -> video
            10 => [1],          // Abid -> video
            11 => [1],          // Danish -> video
            12 => [1],          // Asif -> video
            13 => [1],          // Suneem -> video
            14 => [1],          // Mohsin -> video
            15 => [3, 5],       // Muntazir -> kashmir_impulse, ecommerce
            16 => [3, 6],       // Irfan -> kashmir_impulse, operations
            17 => [4],          // Moin -> social
            18 => [2],          // Mudasir -> web
            19 => [6],          // Bisma -> operations
        ];

        foreach ($userDepts as $userId => $deptIds) {
            $user = User::find($userId);
            $user->departments()->attach($deptIds);
        }

        $this->command->info('✅ All users and departments seeded successfully!');
    }
}
