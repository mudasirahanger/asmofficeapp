<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class Client extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['name'];

    public function projects()
    {
        return $this->hasMany(Project::class);
    }

    /**
     * Resolve a `client_id` / free-text `client` combination in a project
     * create/update payload into a canonical Client, find-or-creating one
     * from a name if only a string was given (matched case-insensitively,
     * trimmed, so "Acme Corp" and "acme corp " reuse the same client
     * instead of creating a duplicate). Always leaves `client` set to the
     * resolved Client's exact stored name, so the denormalized string
     * column stays in sync with whichever Client it points at.
     *
     * If `client_id` is given but doesn't resolve to a real client (stale
     * value, deleted client), it's dropped and treated as absent rather
     * than failing the whole request — falls through to the free-text path.
     */
    public static function resolveForProject(array $data): array
    {
        if (!empty($data['client_id'])) {
            $client = static::find($data['client_id']);
            if ($client) {
                $data['client'] = $client->name;
                return $data;
            }
            unset($data['client_id']);
        }

        if (!empty($data['client']) && is_string($data['client']) && trim($data['client']) !== '') {
            $name = trim($data['client']);
            $client = static::whereRaw('LOWER(name) = ?', [strtolower($name)])->first();
            if (!$client) {
                $client = static::create(['name' => $name]);
            }
            $data['client_id'] = $client->id;
            $data['client'] = $client->name;
        }

        return $data;
    }
}
