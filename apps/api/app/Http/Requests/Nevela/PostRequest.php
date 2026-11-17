<?php

namespace App\Http\Requests\Nevela;

use App\Models\Post;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Nevela\Laravel\Http\ResourceRequest;

/**
 * Validation for creating (POST), replacing (PUT) and patching (PATCH) a Post.
 * PATCH makes every rule "sometimes"; PUT clears optional fields left out.
 */
class PostRequest extends ResourceRequest
{
    public function authorize(): bool
    {
        $post = $this->route('post');

        return $post instanceof Post
            ? Gate::allows('update', $post)
            : Gate::allows('create', Post::class);
    }

    // nevela:generated:start hash=53bb5ba69592
    public function rules(): array
    {
        $post = $this->route('post');

        return [
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'alpha_dash', 'max:255', Rule::unique('posts', 'slug')->ignore($post)],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'body' => ['required', 'string', 'max:65535'],
            'image' => ['nullable', 'string', 'max:512', new \Nevela\Laravel\Rules\UploadKey('Post', 'image')],
            'publishedAt' => ['nullable', 'date'],
        ];
    }

    protected function columns(): array
    {
        return ['title' => 'title', 'slug' => 'slug', 'excerpt' => 'excerpt', 'body' => 'body', 'image' => 'image', 'publishedAt' => 'published_at'];
    }

    /** Fields that hold HTML. It is cleaned before it is checked, so the length is that of what is kept. */
    protected function rich(): array
    {
        return ['body'];
    }

    /** Fields made from another when a create leaves them empty. They are never remade afterwards. */
    protected function made(): array
    {
        return ['slug' => ['from' => 'title', 'table' => 'posts', 'column' => 'slug']];
    }
    // nevela:generated:end
}
