// Generated once by Nevela for Banner. This file is yours.
import { ResourceFormPage } from "@/components/dashboard/resource-form-page";
import bannerResource from "@/resources/banner.resource";

export default async function EditBannerPage({ params }: { params: Promise<{ id: string }> }) {
  return <ResourceFormPage resource={bannerResource} id={(await params).id} />;
}
