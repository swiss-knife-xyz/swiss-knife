export interface Subdomain {
  base: string;
  paths: string[];
}

declare const subdomains: { [key: string]: Subdomain };

export default subdomains;
