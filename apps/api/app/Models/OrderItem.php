<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    use HasUuids;

    protected $table = 'order_items';

    // nevela:generated:start hash=fb5a55c13604
    // Deleted records go to the trash, where they can be restored for a while.
    use \Nevela\Laravel\Concerns\Trashable;
    // Copied from the record it points at when it is made, and when it is pointed at another.
    use \Nevela\Laravel\Concerns\Copies;

    protected function copied(): array
    {
        return ['price' => ['beverage_id', Beverage::class, 'price']];
    }

    protected $fillable = ['beverage_id', 'quantity', 'price', 'order_id'];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'price' => 'float',
        ];
    }

    public function beverage(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Beverage::class, 'beverage_id');
    }

    public function order(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }
    // nevela:generated:end

    // Your own relationships, scopes and accessors go here — outside the generated block.
}
