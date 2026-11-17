<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    use HasUuids;

    protected $table = 'posts';

    // nevela:generated:start hash=b5588bac8778
    // Deleted records go to the trash, where they can be restored for a while.
    use \Nevela\Laravel\Concerns\Trashable;

    protected $fillable = ['title', 'slug', 'excerpt', 'body', 'image', 'published_at'];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
        ];
    }
    // nevela:generated:end

    // Your own relationships, scopes and accessors go here — outside the generated block.

    /**
     * Which posts anyone may read, signed in or not: the published ones. The
     * public list and the public page of one both go through here. A draft has no
     * published_at, and a scheduled one has a time still to come, which this lets
     * through when it does, with nobody saving anything.
     */
    public function scopePublicQuery(\Illuminate\Database\Eloquent\Builder $query): void
    {
        $query->whereNotNull('published_at')->where('published_at', '<=', now());
    }
}
