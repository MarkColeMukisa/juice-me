// Generated once by Nevela for the blog at /blog. This file is yours.
import type { MetadataRoute } from "next";
import { allPosts, blog, siteUrl } from "@/lib/blog";

/** Rebuilt at most once a minute, so a post is in it soon after it is published. */
export const revalidate = 60;

/** The site's pages, and every published post. Add your own pages to the first list. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const home = siteUrl();
  const posts = await allPosts();
  return [
    { url: home, changeFrequency: "monthly", priority: 1 },
    { url: `${home}${blog.path}`, changeFrequency: "daily", priority: 0.8 },
    ...posts.map((post) => ({
      url: `${home}${blog.path}/${post.slug}`,
      lastModified: post.publishedAt ? new Date(post.publishedAt) : undefined,
    })),
  ];
}
