<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds a real `clients` relationship on top of the existing free-text
     * `projects.client` column, and backfills it by normalizing existing
     * client names: case/whitespace variants of the same name (e.g.
     * "Acme Corp" vs "Acme corp.") are merged into a single canonical
     * `clients` row instead of staying as separate strings. The `client`
     * string column is kept (many screens and the invoice PDF still read it
     * directly) but is now treated as a denormalized cache of the linked
     * Client's name, kept in sync by the application layer going forward
     * (see App\Models\Client::resolveForProject and ClientController@update).
     */
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->foreignId('client_id')->nullable()->after('client')
                ->constrained('clients')->nullOnDelete();
        });

        $projects = DB::table('projects')
            ->whereNotNull('client')
            ->where('client', '!=', '')
            ->get(['id', 'client']);

        $clientIdByNormalizedName = [];

        foreach ($projects as $project) {
            $trimmed = trim((string) $project->client);
            if ($trimmed === '') {
                continue;
            }
            $normalized = strtolower($trimmed);

            if (!isset($clientIdByNormalizedName[$normalized])) {
                $clientIdByNormalizedName[$normalized] = DB::table('clients')->insertGetId([
                    'name'       => $trimmed,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            DB::table('projects')
                ->where('id', $project->id)
                ->update(['client_id' => $clientIdByNormalizedName[$normalized]]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropConstrainedForeignId('client_id');
        });
    }
};
