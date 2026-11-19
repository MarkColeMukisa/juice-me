<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

/**
 * The shop as it was built locally: its categories, drinks, banners and blog posts, with
 * their photos (in database/seeders/shop). No people, orders or likes.
 *
 *   php artisan db:seed --class=ShopSeeder --force
 *
 * It can be run again: what it brought before is updated, not doubled, and nothing
 * added since is touched.
 */
class ShopSeeder extends Seeder
{
    public function run(): void
    {
        $from = database_path('seeders/shop');
        $data = json_decode(File::get($from.'/data.json'), true, flags: JSON_THROW_ON_ERROR);

        // The photos first, at the keys the records name, on the disk each was stored on.
        $files = 0;
        foreach ($data['uploads'] as $upload) {
            $keys = [$upload['key'], ...array_column(json_decode($upload['renditions'] ?? '[]', true) ?: [], 'key')];
            foreach ($keys as $key) {
                $path = $from.'/files/'.$key;
                if (File::exists($path)) {
                    Storage::disk($upload['disk'])->put($key, File::get($path));
                    $files++;
                }
            }
        }

        DB::transaction(function () use ($data): void {
            DB::table('nevela_uploads')->upsert($data['uploads'], ['id']);
            // Categories before what belongs to one.
            foreach (['categories', 'beverages', 'banners', 'posts'] as $table) {
                foreach (array_chunk($data['tables'][$table] ?? [], 100) as $rows) {
                    DB::table($table)->upsert($rows, ['id']);
                }
            }
        });

        $counts = collect($data['tables'])->map(fn (array $rows, string $table) => count($rows).' '.$table)->implode(', ');
        $this->command?->info("Shop seeded: {$counts}, {$files} photo files.");
    }
}
