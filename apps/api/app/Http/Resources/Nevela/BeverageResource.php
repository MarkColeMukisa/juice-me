<?php

namespace App\Http\Resources\Nevela;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** A Beverage as Flare's client expects it: camelCase keys, unwrapped. */
class BeverageResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            // nevela:generated:start hash=14ef2878e5be
            'name' => $this->name,
            'description' => $this->description,
            'price' => $this->price,
            'size' => $this->size,
            'image' => $this->image,
            'imageFile' => \Nevela\Laravel\Nevela::file($this->image),
            'categoryId' => $this->category_id,
            'available' => $this->available,
            'featured' => $this->featured,
            // nevela:generated:end
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
