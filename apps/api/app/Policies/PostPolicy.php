<?php

namespace App\Policies;

use App\Models\Post;
use App\Models\User;

/**
 * Who may do what with Posts. Generated once — this file is yours.
 *
 * Each action asks for a permission, which a person has through their roles
 * (the dashboard's Roles screen). Add your own conditions beside them, e.g.
 * `return $user->can('posts.edit') && $post->user_id === $user->id;`.
 */
class PostPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('posts.view');
    }

    public function view(User $user, Post $post): bool
    {
        return $user->can('posts.view');
    }

    public function create(User $user): bool
    {
        return $user->can('posts.create');
    }

    public function update(User $user, Post $post): bool
    {
        return $user->can('posts.edit');
    }

    public function delete(User $user, Post $post): bool
    {
        return $user->can('posts.delete');
    }

    /** Bring a deleted one back from the trash. */
    public function restore(User $user, Post $post): bool
    {
        return $user->can('posts.delete');
    }

    /** Remove a deleted one from the trash, for good. */
    public function forceDelete(User $user, Post $post): bool
    {
        return $user->can('posts.delete');
    }
}
