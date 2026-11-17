<?php

namespace App\Http\Requests\Nevela;

use App\Models\Banner;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Nevela\Laravel\Http\ResourceRequest;

/**
 * Validation for creating (POST), replacing (PUT) and patching (PATCH) a Banner.
 * PATCH makes every rule "sometimes"; PUT clears optional fields left out.
 */
class BannerRequest extends ResourceRequest
{
    public function authorize(): bool
    {
        $banner = $this->route('banner');

        return $banner instanceof Banner
            ? Gate::allows('update', $banner)
            : Gate::allows('create', Banner::class);
    }

    // nevela:generated:start hash=e60a33629dce
    public function rules(): array
    {
        $banner = $this->route('banner');

        return [
            'title' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'image' => ['nullable', 'string', 'max:512', new \Nevela\Laravel\Rules\UploadKey('Banner', 'image')],
            'categoryId' => ['nullable', 'uuid', Rule::exists('categories', 'id')],
            'active' => ['sometimes', 'required', 'boolean'],
            'position' => ['sometimes', 'required', 'integer'],
        ];
    }

    protected function columns(): array
    {
        return ['title' => 'title', 'subtitle' => 'subtitle', 'image' => 'image', 'categoryId' => 'category_id', 'active' => 'active', 'position' => 'position'];
    }

    /** What a field is when a create leaves it out. */
    protected function defaults(): array
    {
        return ['active' => true, 'position' => 0];
    }
    // nevela:generated:end
}
