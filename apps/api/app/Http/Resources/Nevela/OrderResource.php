<?php

namespace App\Http\Resources\Nevela;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** A Order as Flare's client expects it: camelCase keys, unwrapped. */
class OrderResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            // nevela:generated:start hash=8fb965800ec9
            'number' => $this->number,
            'customer' => $this->customer,
            'email' => $this->email,
            'phone' => $this->phone,
            'delivery' => $this->delivery,
            'details' => $this->details,
            'status' => $this->status,
            'total' => $this->total,
            'items' => $this->whenLoaded('orderItems', fn () => OrderItemResource::collection($this->orderItems)->resolve($request)),
            // nevela:generated:end
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
