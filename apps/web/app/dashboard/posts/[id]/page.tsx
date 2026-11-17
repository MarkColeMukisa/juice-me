// Generated once by Nevela for Post. This file is yours.
import { RecordDetail } from "@/components/dashboard/record-detail";
import postResource from "@/resources/post.resource";

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <RecordDetail resource={postResource} id={(await params).id} />;
}
