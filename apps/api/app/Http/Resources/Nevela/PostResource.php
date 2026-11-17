<?php

namespace App\Http\Resources\Nevela;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** A Post as Flare's client expects it: camelCase keys, unwrapped. */
class PostResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            // nevela:generated:start hash=6a59cd71a742
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
            'body' => \Nevela\Laravel\Nevela::html($this->body),
            'image' => $this->image,
            'imageFile' => \Nevela\Laravel\Nevela::file($this->image),
            'publishedAt' => $this->published_at?->toJSON(),
            // nevela:generated:end
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
