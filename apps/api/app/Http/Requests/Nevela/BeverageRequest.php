<?php

namespace App\Http\Requests\Nevela;

use App\Models\Beverage;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Nevela\Laravel\Http\ResourceRequest;

/**
 * Validation for creating (POST), replacing (PUT) and patching (PATCH) a Beverage.
 * PATCH makes every rule "sometimes"; PUT clears optional fields left out.
 */
class BeverageRequest extends ResourceRequest
{
    public function authorize(): bool
    {
        $beverage = $this->route('beverage');

        return $beverage instanceof Beverage
            ? Gate::allows('update', $beverage)
            : Gate::allows('create', Beverage::class);
    }

    // nevela:generated:start hash=a5684e826798
    public function rules(): array
    {
        $beverage = $this->route('beverage');

        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:65535'],
            'price' => ['required', 'numeric'],
            'size' => ['sometimes', 'required', Rule::in(['small', 'medium', 'large'])],
            'image' => ['nullable', 'string', 'max:512', new \Nevela\Laravel\Rules\UploadKey('Beverage', 'image')],
            'categoryId' => ['required', 'uuid', Rule::exists('categories', 'id')],
            'available' => ['sometimes', 'required', 'boolean'],
        ];
    }

    protected function columns(): array
    {
        return ['name' => 'name', 'description' => 'description', 'price' => 'price', 'size' => 'size', 'image' => 'image', 'categoryId' => 'category_id', 'available' => 'available'];
    }

    /** What a field is when a create leaves it out. */
    protected function defaults(): array
    {
        return ['size' => 'medium', 'available' => true];
    }
    // nevela:generated:end
}
