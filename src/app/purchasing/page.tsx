import { ModuleLandingPage } from "@/modules/core/module-landing-page";

// Auth-gated, per-user data: never statically cache this page.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Purchasing · AKRA WEBAPP V2",
};

export default function PurchasingPage() {
  return <ModuleLandingPage appKey="purchasing" />;
}
