import PrivacyPageClient from "./PrivacyPageClient";
import { getCachedLinkPreview } from "@/lib/linkPreview";
import { externalDashboardLinks } from "./data";

export const revalidate = 604800;

const PrivacyPage = async () => {
  const externalDashboards = await Promise.all(
    externalDashboardLinks.map((dashboard) => getCachedLinkPreview(dashboard))
  );

  return <PrivacyPageClient externalDashboards={externalDashboards} />;
};

export default PrivacyPage;
