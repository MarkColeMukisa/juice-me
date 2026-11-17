// Generated once by Nevela for Banner. This file is yours.
import { PageHeader } from "@/components/dashboard/page-header";
import { ResourceStats } from "@/components/dashboard/resource-stats";
import { ResourceTable } from "@/components/dashboard/resource-table";
import type { SearchParams } from "@/components/dashboard/query";
import bannerResource from "@/resources/banner.resource";

export const metadata = { title: bannerResource.pluralLabel };

export default async function BannerListPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <>
      <PageHeader title={bannerResource.pluralLabel} crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: bannerResource.pluralLabel }]} />
      <ResourceStats resource={bannerResource} />
      <ResourceTable resource={bannerResource} searchParams={await searchParams} />
    </>
  );
}
