import { CID } from "multiformats/cid";
import { base36 } from "multiformats/bases/base36";

export type IPFSContent = { cid: string; suffix: string };

// Parse locally: generating links never needs to contact the pasted gateway.
export function parseIPFSInput(input: string): IPFSContent | null {
  const value = input.trim();
  if (!value || /[\\\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    let content: string;
    if (/^ipfs:\/\//i.test(value)) {
      content = value.replace(/^ipfs:\/\/(?:ipfs\/)?/i, "");
    } else if (
      /^https?:\/\//i.test(value) ||
      /^[^/?#]+\.[^/?#]+(?:[/?#]|$)/.test(value)
    ) {
      const url = new URL(
        /^https?:\/\//i.test(value) ? value : `https://${value}`
      );
      const subdomain = /^([^.]+)\.ipfs\./i.exec(url.hostname);
      if (subdomain)
        content = subdomain[1] + url.pathname + url.search + url.hash;
      else {
        const path = /\/ipfs\/(.+)/i.exec(url.pathname);
        if (!path) return null;
        content = path[1] + url.search + url.hash;
      }
    } else content = value.replace(/^\/?ipfs\//i, "");

    const match = /^([^/?#]+)(.*)$/.exec(content);
    if (!match) return null;
    const cidText = decodeURIComponent(match[1]);
    const cid = CID.parse(
      cidText,
      cidText.startsWith("k") ? base36.decoder : undefined
    ).toString();
    const suffix = match[2];
    // A link must remain inside this CID, including with percent-encoded paths.
    const path = suffix.split(/[?#]/, 1)[0];
    if (
      path
        .split("/")
        .some((part) => [".", ".."].includes(decodeURIComponent(part)))
    )
      return null;
    return { cid, suffix };
  } catch {
    return null;
  }
}

export function ipfsContentUrl(gateway: string, content: IPFSContent): string {
  return new URL(`${gateway}${content.cid}${content.suffix}`).href;
}

export const IPFS_EXAMPLES = [
  {
    label: "JSON metadata",
    value: "bafkreihs5osgaf4pphbesznyj3slixc6qi26rfucwrnz2cvk5jyusthvxi",
  },
  {
    label: "Image",
    value: "ipfs://bafkreiavuiwuq4hkjh743g4j6s6vxk2mvrahwt7iveiblm6h6wuknj4tde",
  },
] as const;
