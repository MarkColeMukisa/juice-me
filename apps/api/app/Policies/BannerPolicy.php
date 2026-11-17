<?php

namespace App\Policies;

use App\Models\Banner;
use App\Models\User;

/**
 * Who may do what with Banners. Generated once — this file is yours.
 *
 * Each action asks for a permission, which a person has through their roles
 * (the dashboard's Roles screen). Add your own conditions beside them, e.g.
 * `return $user->can('banners.edit') && $banner->user_id === $user->id;`.
 */
class BannerPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('banners.view');
    }

    public function view(User $user, Banner $banner): bool
    {
        return $user->can('banners.view');
    }

    public function create(User $user): bool
    {
        return $user->can('banners.create');
    }

    public function update(User $user, Banner $banner): bool
    {
        return $user->can('banners.edit');
    }

    public function delete(User $user, Banner $banner): bool
    {
        return $user->can('banners.delete');
    }

    /** Bring a deleted one back from the trash. */
    public function restore(User $user, Banner $banner): bool
    {
        return $user->can('banners.delete');
    }

    /** Remove a deleted one from the trash, for good. */
    public function forceDelete(User $user, Banner $banner): bool
    {
        return $user->can('banners.delete');
    }
}
