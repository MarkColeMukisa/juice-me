<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Banner extends Model
{
    use HasUuids;

    protected $table = 'banners';

    // nevela:generated:start hash=e9d4f2dcba80
    // Deleted records go to the trash, where they can be restored for a while.
    use \Nevela\Laravel\Concerns\Trashable;

    protected $fillable = ['title', 'subtitle', 'image', 'category_id', 'active', 'position'];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'position' => 'integer',
        ];
    }

    public function category(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }
    // nevela:generated:end

    // Your own relationships, scopes and accessors go here — outside the generated block.

    // The home page's banners, as anyone sees them: only those switched on.
    public function scopePublicQuery(Builder $query): void
    {
        $query->where('active', true);
    }
}
