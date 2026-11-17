<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nevela\BeverageRequest;
use App\Http\Resources\Nevela\BeverageResource;
use App\Models\Beverage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Nevela\Laravel\Nevela;

/**
 * Beverages over Flare's REST contract:
 * GET /beverages?page&perPage&sort=-createdAt&q&filter[field] → { data, meta }.
 */
class BeverageController extends Controller
{
    // nevela:generated:start hash=bcb45e624947
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Beverage::class);

        return Nevela::list(Beverage::query(), 'Beverage', $request, BeverageResource::class);
    }

    public function stats(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Beverage::class);

        return Nevela::stats(Beverage::query(), 'Beverage', $request);
    }

    public function insights(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Beverage::class);

        return Nevela::insights(Beverage::query(), 'Beverage', $request);
    }

    public function store(BeverageRequest $request): JsonResponse
    {
        $beverage = Beverage::create($request->values());

        return (new BeverageResource($beverage->refresh()))
            ->response()
            ->setStatusCode(201)
            ->header('Location', $request->url().'/'.$beverage->getKey());
    }

    public function bulk(Request $request): JsonResponse
    {
        Gate::authorize('create', Beverage::class);

        return Nevela::createMany(Beverage::class, BeverageRequest::class, BeverageResource::class, $request);
    }

    public function show(Beverage $beverage): BeverageResource
    {
        Gate::authorize('view', $beverage);

        return new BeverageResource($beverage);
    }

    public function update(BeverageRequest $request, Beverage $beverage): BeverageResource
    {
        $beverage->update($request->values());

        return new BeverageResource($beverage->refresh());
    }

    public function destroy(Beverage $beverage): Response|JsonResponse
    {
        Gate::authorize('delete', $beverage);
        if (($count = \App\Models\OrderItem::query()->where('beverage_id', $beverage->getKey())->count()) > 0) {
            return response()->json(['error' => $count === 1
                ? '1 order item belongs to this beverage. Move or delete it first.'
                : "{$count} order items belong to this beverage. Move or delete them first."], 409);
        }
        $beverage->delete();

        return response()->noContent();
    }
    // nevela:generated:end
}
