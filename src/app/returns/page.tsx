import { ModuleLandingPage } from "@/modules/core/module-landing-page";

// Auth-gated, per-user data: never statically cache this page.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Returns · AKRA WEBAPP V2",
};

export default function ReturnsPage() {
  return <ModuleLandingPage appKey="returns" />;
}
