// Generated once by Nevela for Beverage. This file is yours.
import { PageHeader } from "@/components/dashboard/page-header";
import { ResourceStats } from "@/components/dashboard/resource-stats";
import { ResourceTable } from "@/components/dashboard/resource-table";
import type { SearchParams } from "@/components/dashboard/query";
import beverageResource from "@/resources/beverage.resource";

export const metadata = { title: beverageResource.pluralLabel };

export default async function BeverageListPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <>
      <PageHeader title={beverageResource.pluralLabel} crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: beverageResource.pluralLabel }]} />
      <ResourceStats resource={beverageResource} />
      <ResourceTable resource={beverageResource} searchParams={await searchParams} />
    </>
  );
}
