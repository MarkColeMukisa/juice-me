// Generated once by Nevela for Beverage. This file is yours.
import { RecordDetail } from "@/components/dashboard/record-detail";
import beverageResource from "@/resources/beverage.resource";

export default async function BeverageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <RecordDetail resource={beverageResource} id={(await params).id} />;
}
