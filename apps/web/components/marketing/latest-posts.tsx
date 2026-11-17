// Generated once by Nevela for the blog at /blog. This file is yours.
import Link from "next/link";
import { blog, listPosts, postDate } from "@/lib/blog";

/** The newest three posts on the home page, and the way to the rest. Nothing while none is published. */
export async function LatestPosts() {
  const { posts } = await listPosts(1, 3);
  if (posts.length === 0) return null;

  return (
    <section className="border-t border-border px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-4xl text-balance">From the {blog.title.toLowerCase()}</h2>
            <p className="mt-4 text-lg text-foreground-muted">{blog.description}</p>
          </div>
          <Link href={blog.path} className="text-sm font-medium hover:underline">
            Read the {blog.title.toLowerCase()} →
          </Link>
        </div>
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
                  <h3 className="text-xl text-balance group-hover:underline">{post.title}</h3>
                  <p className="line-clamp-3 text-sm leading-relaxed text-foreground-muted">{post.excerpt}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
