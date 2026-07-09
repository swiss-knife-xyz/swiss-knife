import PrivacyPageClient from "./PrivacyPageClient";
import {
  getCachedLinkPreview,
  LINK_PREVIEW_REVALIDATE_SECONDS,
} from "@/lib/linkPreview";
import { externalDashboardLinks } from "./data";

export const revalidate = LINK_PREVIEW_REVALIDATE_SECONDS;

const PrivacyPage = async () => {
  const externalDashboards = await Promise.all(
    externalDashboardLinks.map((dashboard) => getCachedLinkPreview(dashboard))
  );

  return <PrivacyPageClient externalDashboards={externalDashboards} />;
};

export default PrivacyPage;
