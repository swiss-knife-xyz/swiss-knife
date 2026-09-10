import FaucetPageClient from "./FaucetPageClient";
import { getFaucetMetadata } from "./metadata";

export const metadata = getFaucetMetadata();

const FaucetPage = () => <FaucetPageClient />;

export default FaucetPage;
