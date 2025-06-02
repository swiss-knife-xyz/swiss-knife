declare module "highlightjs-solidity" {
  import type { HLJSApi } from "highlight.js";

  function solidityHighlight(hljs: HLJSApi): void;
  export default solidityHighlight;
}
