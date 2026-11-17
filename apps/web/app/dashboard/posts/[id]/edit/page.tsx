// Generated once by Nevela for Post. This file is yours.
import { ResourceFormPage } from "@/components/dashboard/resource-form-page";
import postResource from "@/resources/post.resource";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  return <ResourceFormPage resource={postResource} id={(await params).id} />;
}
