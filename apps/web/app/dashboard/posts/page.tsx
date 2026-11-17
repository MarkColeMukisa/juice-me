// Generated once by Nevela for Post. This file is yours.
import { PageHeader } from "@/components/dashboard/page-header";
import { ResourceStats } from "@/components/dashboard/resource-stats";
import { ResourceTable } from "@/components/dashboard/resource-table";
import type { SearchParams } from "@/components/dashboard/query";
import postResource from "@/resources/post.resource";

export const metadata = { title: postResource.pluralLabel };

export default async function PostListPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <>
      <PageHeader title={postResource.pluralLabel} crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: postResource.pluralLabel }]} />
      <ResourceStats resource={postResource} />
      <ResourceTable resource={postResource} searchParams={await searchParams} />
    </>
  );
}
