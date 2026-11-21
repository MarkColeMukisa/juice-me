import { CustomerHome } from "@/components/customer-home";
import { StaffHome } from "@/components/staff-home";
import { useAuth } from "@/lib/auth";

/** Staff and customers are given different homes: see lib/shell.ts. */
export default function HomeScreen() {
  const { shell, user } = useAuth();
  // Someone browsing before signing in sees the shop, as a customer would.
  return shell === "customer" || !user ? <CustomerHome /> : <StaffHome />;
}
