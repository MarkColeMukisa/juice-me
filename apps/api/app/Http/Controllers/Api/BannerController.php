<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nevela\BannerRequest;
use App\Http\Resources\Nevela\BannerResource;
use App\Models\Banner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Nevela\Laravel\Nevela;

/**
 * Banners over Flare's REST contract:
 * GET /banners?page&perPage&sort=-createdAt&q&filter[field] → { data, meta }.
 */
class BannerController extends Controller
{
    // nevela:generated:start hash=28598d38040c
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Banner::class);

        return Nevela::list(Banner::query(), 'Banner', $request, BannerResource::class);
    }

    public function stats(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Banner::class);

        return Nevela::stats(Banner::query(), 'Banner', $request);
    }

    public function insights(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Banner::class);

        return Nevela::insights(Banner::query(), 'Banner', $request);
    }

    public function store(BannerRequest $request): JsonResponse
    {
        $banner = Banner::create($request->values());

        return (new BannerResource($banner->refresh()))
            ->response()
            ->setStatusCode(201)
            ->header('Location', $request->url().'/'.$banner->getKey());
    }

    public function bulk(Request $request): JsonResponse
    {
        Gate::authorize('create', Banner::class);

        return Nevela::createMany(Banner::class, BannerRequest::class, BannerResource::class, $request);
    }

    public function show(Banner $banner): BannerResource
    {
        Gate::authorize('view', $banner);

        return new BannerResource($banner);
    }

    public function update(BannerRequest $request, Banner $banner): BannerResource
    {
        $banner->update($request->values());

        return new BannerResource($banner->refresh());
    }

    public function destroy(Banner $banner): Response
    {
        Gate::authorize('delete', $banner);
        $banner->delete();

        return response()->noContent();
    }
    // nevela:generated:end
}
