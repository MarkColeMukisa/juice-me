<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nevela\PostRequest;
use App\Http\Resources\Nevela\PostResource;
use App\Models\Post;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Nevela\Laravel\Nevela;

/**
 * Posts over Flare's REST contract:
 * GET /posts?page&perPage&sort=-createdAt&q&filter[field] → { data, meta }.
 */
class PostController extends Controller
{
    // nevela:generated:start hash=63f8ceec1ecf
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Post::class);

        return Nevela::list(Post::query(), 'Post', $request, PostResource::class);
    }

    public function stats(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Post::class);

        return Nevela::stats(Post::query(), 'Post', $request);
    }

    public function insights(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Post::class);

        return Nevela::insights(Post::query(), 'Post', $request);
    }

    public function store(PostRequest $request): JsonResponse
    {
        $post = Post::create($request->values());

        return (new PostResource($post->refresh()))
            ->response()
            ->setStatusCode(201)
            ->header('Location', $request->url().'/'.$post->getKey());
    }

    public function bulk(Request $request): JsonResponse
    {
        Gate::authorize('create', Post::class);

        return Nevela::createMany(Post::class, PostRequest::class, PostResource::class, $request);
    }

    public function show(Post $post): PostResource
    {
        Gate::authorize('view', $post);

        return new PostResource($post);
    }

    public function update(PostRequest $request, Post $post): PostResource
    {
        $post->update($request->values());

        return new PostResource($post->refresh());
    }

    public function destroy(Post $post): Response
    {
        Gate::authorize('delete', $post);
        $post->delete();

        return response()->noContent();
    }
    // nevela:generated:end
}
