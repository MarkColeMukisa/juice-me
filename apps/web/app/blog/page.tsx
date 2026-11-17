// Generated once by Nevela for the blog at /blog. This file is yours.
import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { blog, listPosts, postDate } from "@/lib/blog";

export const metadata: Metadata = {
  title: blog.title,
  description: blog.description,
  alternates: { types: { "application/rss+xml": `${blog.path}/feed.xml` } },
};

/** The blog: published posts, newest first. */
export default async function BlogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const asked = Number.parseInt((await searchParams).page ?? "1", 10);
  const { posts, page, totalPages } = await listPosts(Number.isInteger(asked) && asked > 0 ? asked : 1);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <header className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl">{blog.title}</h1>
          <p className="mt-4 text-lg text-foreground-muted">{blog.description}</p>
        </header>

        {posts.length === 0 ? (
          <p className="mt-16 text-foreground-muted">Nothing has been published yet.</p>
        ) : (
          <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <li key={post.id}>
                <Link href={`${blog.path}/${post.slug}`} className="group flex h-full flex-col overflow-hidden rounded-[calc(var(--radius)+4px)] border border-border bg-surface hover:border-foreground/30">
                  {post.image && (
                    // eslint-disable-next-line @next/next/no-img-element -- already the right size: Laravel made this rendition when the picture was uploaded
                    <img src={post.image} alt="" loading="lazy" decoding="async" className="aspect-[16/9] w-full object-cover" />
                  )}
                  <div className="flex flex-1 flex-col gap-2 p-6">
                    {post.publishedAt && (
                      <time dateTime={post.publishedAt} className="text-xs text-foreground-muted">
                        {postDate(post)}
                      </time>
                    )}
                    <h2 className="text-xl text-balance group-hover:underline">{post.title}</h2>
                    <p className="line-clamp-3 text-sm leading-relaxed text-foreground-muted">{post.excerpt}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <nav aria-label="Pages" className="mt-12 flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link href={page === 2 ? blog.path : `${blog.path}?page=${page - 1}`} className="hover:underline">
                ← Newer
              </Link>
            ) : (
              <span />
            )}
            <span className="text-foreground-muted">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={`${blog.path}?page=${page + 1}`} className="hover:underline">
                Older →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </main>
    </>
  );
}
