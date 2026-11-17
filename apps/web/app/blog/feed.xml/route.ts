// Generated once by Nevela for the blog at /blog. This file is yours.
import { blog, allPosts, siteUrl } from "@/lib/blog";
import { site } from "@/lib/site";

/** Rebuilt at most once a minute, like the pages. */
export const revalidate = 60;

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The blog as an RSS feed: the latest fifty published posts. */
export async function GET() {
  const posts = await allPosts(50);
  const home = siteUrl();
  const items = posts
    .map((post) => {
      const link = `${home}${blog.path}/${post.slug}`;
      return [
        "    <item>",
        `      <title>${escape(post.title)}</title>`,
        `      <link>${escape(link)}</link>`,
        `      <guid isPermaLink="true">${escape(link)}</guid>`,
        post.publishedAt ? `      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>` : "",
        `      <description>${escape(post.excerpt)}</description>`,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "  <channel>",
    `    <title>${escape(`${site.name}: ${blog.title}`)}</title>`,
    `    <link>${escape(`${home}${blog.path}`)}</link>`,
    `    <description>${escape(blog.description)}</description>`,
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
