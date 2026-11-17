// Generated once by Nevela for the blog at /blog. This file is yours.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/marketing/site-header";
import { BODY_IS_HTML, blog, getPost, postDate, siteUrl } from "@/lib/blog";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

/** What a search engine and a shared link show: the title, the excerpt and the picture. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return { title: "Not found" };
  const image = post.imageLarge ? [new URL(post.imageLarge, siteUrl()).toString()] : undefined;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `${siteUrl()}${blog.path}/${post.slug}` },
    openGraph: { type: "article", title: post.title, description: post.excerpt, publishedTime: post.publishedAt ?? undefined, images: image },
    twitter: { card: image ? "summary_large_image" : "summary", title: post.title, description: post.excerpt, images: image },
  };
}

/** One post. A draft, one scheduled for later and one that never was are all a 404. */
export default async function PostPage({ params }: Props) {
  const post = await getPost((await params).slug);
  if (!post) notFound();

  // What the post is, for search engines (schema.org): a title, a date, a picture, who published it.
  const url = `${siteUrl()}${blog.path}/${post.slug}`;
  const article = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || undefined,
    datePublished: post.publishedAt ?? undefined,
    image: post.imageLarge ? new URL(post.imageLarge, siteUrl()).toString() : undefined,
    url,
    mainEntityOfPage: url,
    publisher: { "@type": "Organization", name: site.name, url: siteUrl() },
  };

  return (
    <>
      {/* A "<" in a title can't end the script early. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article).replace(/</g, "\\u003c") }} />
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link href={blog.path} className="text-sm text-foreground-muted hover:text-foreground">
          ← {blog.title}
        </Link>
        <article className="mt-8">
          <header>
            {post.publishedAt && (
              <time dateTime={post.publishedAt} className="text-sm text-foreground-muted">
                {postDate(post)}
              </time>
            )}
            <h1 className="mt-2 text-4xl text-balance md:text-5xl">{post.title}</h1>
          </header>
          {post.imageLarge && (
            // eslint-disable-next-line @next/next/no-img-element -- optimised by Laravel when it was uploaded
            <img src={post.imageLarge} alt="" className="mt-10 w-full rounded-[calc(var(--radius)+4px)] border border-border" />
          )}
          {BODY_IS_HTML ? (
            // Laravel cleaned this HTML when the post was saved and again when it was read.
            <div className="rich-text mt-10 text-lg" dangerouslySetInnerHTML={{ __html: post.body }} />
          ) : (
            <div className="mt-10 text-lg leading-relaxed whitespace-pre-line">{post.body}</div>
          )}
        </article>
      </main>
    </>
  );
}
