// Generated once by Nevela for Banner. This file is yours.
import { RecordDetail } from "@/components/dashboard/record-detail";
import bannerResource from "@/resources/banner.resource";

export default async function BannerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <RecordDetail resource={bannerResource} id={(await params).id} />;
}
