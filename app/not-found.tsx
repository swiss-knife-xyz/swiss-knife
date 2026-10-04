import Link from "next/link";
import { getPath } from "@/utils";

export default function NotFound() {
  return (
    <main style={{ padding: "3rem", color: "#FAFAFA", background: "#0A0A0B", minHeight: "100vh" }}>
      <h1>Page not found</h1>
      <p>This URL does not match an ETH.sh tool.</p>
      <Link href={getPath("")}>Browse Ethereum tools</Link>
    </main>
  );
}
