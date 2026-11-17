// Generated once by Nevela for Beverage. This file is yours.
import { ResourceFormPage } from "@/components/dashboard/resource-form-page";
import beverageResource from "@/resources/beverage.resource";

export default async function EditBeveragePage({ params }: { params: Promise<{ id: string }> }) {
  return <ResourceFormPage resource={beverageResource} id={(await params).id} />;
}
