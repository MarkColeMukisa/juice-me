<?php

namespace App\Http\Resources\Nevela;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** A Banner as Flare's client expects it: camelCase keys, unwrapped. */
class BannerResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            // nevela:generated:start hash=5c3f66a27dea
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'image' => $this->image,
            'imageFile' => \Nevela\Laravel\Nevela::file($this->image),
            'categoryId' => $this->category_id,
            'active' => $this->active,
            'position' => $this->position,
            // nevela:generated:end
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
