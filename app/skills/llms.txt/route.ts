import { skillResources } from "../data";

const SITE_URL = "https://skills.eth.sh";

const join = (values: readonly string[]) => values.join(", ");

const inlineCode = (value: string) => `\`${value.replaceAll("`", "'")}\``;

const sentence = (value: string) => value.replace(/\.+$/, "");

const toCatalogLine = (resource: (typeof skillResources)[number]) => {
  const details = [
    `Provider: ${resource.provider}`,
    `Types: ${join(resource.toolTypes)}`,
    `Categories: ${join(resource.categories)}`,
    `Tags: ${join(resource.tags)}`,
    resource.install ? `Install: ${inlineCode(resource.install)}` : undefined,
    `Description: ${sentence(resource.description)}`,
    `Sources: ${resource.sourceUrls.join("; ")}`,
  ].filter(Boolean);

  return `- [${resource.name}](${resource.url}): ${details.join(". ")}`;
};

const getResourcesByType = () => {
  const typeMap = new Map<string, typeof skillResources>();

  skillResources.forEach((resource) => {
    resource.toolTypes.forEach((type) => {
      typeMap.set(type, [...(typeMap.get(type) ?? []), resource]);
    });
  });

  return Array.from(typeMap.entries()).map(([type, resources]) => {
    const lines = resources.map(
      (resource) =>
        `- [${resource.name}](${resource.url}): ${sentence(
          resource.description
        )}`
    );

    return [`## ${type} Resources`, "", ...lines].join("\n");
  });
};

const buildLlmsTxt = () =>
  [
    "# Web3 AI Skills",
    "",
    "> A researched directory of Web3 AI skills, MCP servers, CLIs, wallets, APIs, models, and protocol tools for onchain agents.",
    "",
    "This file is generated from the same data used by the ETH.sh skills UI. Use it to discover agent-facing Web3 resources, choose integration surfaces, and find canonical source URLs.",
    "",
    `Canonical UI: ${SITE_URL}/`,
    `Canonical llms.txt: ${SITE_URL}/llms.txt`,
    "",
    "## Complete Catalog",
    "",
    ...skillResources.map(toCatalogLine),
    "",
    getResourcesByType().join("\n\n"),
    "",
  ].join("\n");

export const dynamic = "force-static";

export const GET = () =>
  new Response(buildLlmsTxt(), {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
