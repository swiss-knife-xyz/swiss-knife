import { faucets } from "../../../../app/faucet/faucets";
import {
  getFaucetChainBySlug,
  getFaucetChainNames,
  getFaucetChainSlug,
} from "../../../../app/faucet/chains";

type FaucetKey = "id" | "url";

const args = process.argv.slice(2);

const readFlagValues = (flag: string) => {
  const values: string[] = [];

  args.forEach((arg, index) => {
    if (arg === flag && args[index + 1]) values.push(args[index + 1]);
  });

  return values;
};

const errors: string[] = [];

const requiredFields = [
  "id",
  "name",
  "provider",
  "url",
  "chain",
  "token",
  "amount",
  "category",
  "reliability",
  "requirement",
  "notes",
  "tags",
] as const;

const checkDuplicates = (key: FaucetKey) => {
  const seen = new Map<string, string[]>();

  faucets.forEach((faucet) => {
    const value = faucet[key];
    seen.set(value, [...(seen.get(value) ?? []), faucet.id]);
  });

  [...seen.entries()]
    .filter(([, ids]) => ids.length > 1)
    .forEach(([value, ids]) => {
      errors.push(`Duplicate ${key} "${value}" in ${ids.join(", ")}`);
    });
};

checkDuplicates("id");
checkDuplicates("url");

faucets.forEach((faucet) => {
  requiredFields.forEach((field) => {
    const value = faucet[field];
    const isMissingArray = Array.isArray(value) && value.length === 0;
    if (!value || isMissingArray) {
      errors.push(`${faucet.id || "(missing id)"} is missing ${field}`);
    }
  });

  try {
    new URL(faucet.url);
  } catch {
    errors.push(`${faucet.id} has invalid url "${faucet.url}"`);
  }

  faucet.variants?.forEach((variant, index) => {
    if (!variant.chain || !variant.token || !variant.amount) {
      errors.push(
        `${faucet.id} variant ${index} is missing chain/token/amount`
      );
    }
  });
});

const providerFilters = readFlagValues("--provider");
providerFilters.forEach((provider) => {
  const matches = faucets.filter(
    (faucet) => faucet.provider.toLowerCase() === provider.toLowerCase()
  );

  console.log(`\nProvider: ${provider} (${matches.length})`);
  matches.forEach((faucet) => {
    console.log(
      `- ${faucet.id}: ${faucet.chain} / ${faucet.token} / ${faucet.url}`
    );
  });
});

const urlFilters = readFlagValues("--url");
urlFilters.forEach((url) => {
  const matches = faucets.filter((faucet) => faucet.url === url);
  console.log(`\nURL: ${url}`);
  console.log(
    matches.length
      ? matches.map((faucet) => `- ${faucet.id}`).join("\n")
      : "- no exact match"
  );
});

const slugFilters = readFlagValues("--slug");
slugFilters.forEach((slug) => {
  const chain = getFaucetChainBySlug(slug);
  console.log(`\nSlug: ${slug}`);

  if (chain) {
    console.log(`- ${chain}`);
    return;
  }

  errors.push(`Slug "${slug}" does not resolve to a faucet chain`);
});

if (args.includes("--chains")) {
  console.log("\nChains:");
  getFaucetChainNames().forEach((chain) => {
    console.log(`- ${getFaucetChainSlug(chain)} -> ${chain}`);
  });
}

if (errors.length) {
  console.error("\nFaucet audit failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`\nFaucet audit passed: ${faucets.length} faucets`);
