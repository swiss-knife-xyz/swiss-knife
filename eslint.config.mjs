import nextVitals from "eslint-config-next/core-web-vitals";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const legacy = require("./.eslintrc.json");

const config = [...nextVitals, { rules: legacy.rules }, ...legacy.overrides];

export default config;
