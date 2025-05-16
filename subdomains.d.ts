export interface Subdomain {
  base: string;
  paths: string[];
  isRelativePath?: boolean;
}

declare const subdomains: { [key: string]: Subdomain };

export default subdomains;
