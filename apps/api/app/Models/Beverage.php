<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Beverage extends Model
{
    use HasUuids;

    protected $table = 'beverages';

    // nevela:generated:start hash=5ce29d06fa78
    // Deleted records go to the trash, where they can be restored for a while.
    use \Nevela\Laravel\Concerns\Trashable;
    // $record->optionLabel('status'): what its value is called, in the dashboard's words.
    use \Nevela\Laravel\Concerns\OptionLabels;

    protected $fillable = ['name', 'description', 'price', 'size', 'image', 'category_id', 'available', 'featured'];

    protected function casts(): array
    {
        return [
            'price' => 'float',
            'available' => 'boolean',
            'featured' => 'boolean',
        ];
    }

    public function category(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function orderItems(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(OrderItem::class, 'beverage_id');
    }
    // nevela:generated:end

    // Your own relationships, scopes and accessors go here — outside the generated block.
}
