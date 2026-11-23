import { afterEach, expect, it, vi } from "vitest";
import { CustomChainStorage } from "./storage";
import { CUSTOM_CHAINS_NAMESPACE } from "./model";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.querySelectorAll("iframe").forEach((frame) => frame.remove());
});
it("authenticates hub messages by both origin and iframe source and keeps namespaces separate", async () => {
  const realWindow = window;
  vi.stubGlobal("window", {
    location: {
      hostname: "explorer.eth.sh",
      origin: "https://explorer.eth.sh",
      protocol: "https:",
      port: "",
    },
    addEventListener: realWindow.addEventListener.bind(realWindow),
    removeEventListener: realWindow.removeEventListener.bind(realWindow),
  });
  const hub = new CustomChainStorage();
  let ready = false;
  const initialization = hub.initialize().then(() => {
    ready = true;
  });
  const iframe = document.querySelector("iframe")!;
  expect(iframe.src).toBe("https://eth.sh/_storage");
  const dispatch = (origin: string, source: Window | null, data: unknown) =>
    realWindow.dispatchEvent(
      new MessageEvent("message", { origin, source, data })
    );
  dispatch("https://evil.test", iframe.contentWindow, {
    type: "STORAGE_HUB_READY",
  });
  dispatch("https://eth.sh", realWindow, { type: "STORAGE_HUB_READY" });
  await Promise.resolve();
  expect(ready).toBe(false);
  dispatch("https://eth.sh", iframe.contentWindow, {
    type: "STORAGE_HUB_READY",
  });
  await initialization;
  expect(ready).toBe(true);
  const changed = vi.fn();
  hub.subscribe(changed);
  dispatch("https://eth.sh", iframe.contentWindow, {
    namespace: "address-book",
    type: "CHANGED",
  });
  expect(changed).not.toHaveBeenCalled();
  dispatch("https://eth.sh", iframe.contentWindow, {
    namespace: CUSTOM_CHAINS_NAMESPACE,
    type: "CHANGED",
  });
  expect(changed).toHaveBeenCalledTimes(1);
  vi.spyOn(iframe.contentWindow!, "postMessage").mockImplementation(
    (request: any, target: any) => {
      expect(target).toBe("https://eth.sh");
      dispatch("https://eth.sh", iframe.contentWindow, {
        namespace: CUSTOM_CHAINS_NAMESPACE,
        id: request.id,
        success: true,
        data: [],
      });
    }
  );
  expect(await hub.request("GET_ALL")).toEqual([]);
});
