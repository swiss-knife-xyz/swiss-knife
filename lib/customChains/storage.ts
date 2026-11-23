import {
  CUSTOM_CHAINS_KEY,
  CUSTOM_CHAINS_NAMESPACE,
  handleCustomChainRequest,
  parseCustomChains,
  type CustomChain,
  type CustomChainRequest,
} from "./model";

type Response = ReturnType<typeof handleCustomChainRequest>;
export class CustomChainStorage {
  private iframe: HTMLIFrameElement | null = null;
  private pending = new Map<
    string,
    {
      resolve: (value: Response) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private listeners = new Set<() => void>();
  private ready: Promise<void> | null = null;
  private origin = "";
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private notify = () => this.listeners.forEach((listener) => listener());
  private localChange = (event: StorageEvent) => {
    if (event.key === CUSTOM_CHAINS_KEY || event.key === null) this.notify();
  };
  private message = (event: MessageEvent) => {
    if (
      event.origin !== this.origin ||
      event.source !== this.iframe?.contentWindow
    )
      return;
    if (event.data?.namespace !== CUSTOM_CHAINS_NAMESPACE) return;
    if (event.data.type === "CHANGED") {
      this.notify();
      return;
    }
    const pending = this.pending.get(event.data.id);
    if (pending) {
      clearTimeout(pending.timer);
      this.pending.delete(event.data.id);
      pending.resolve(event.data);
    }
  };
  initialize(): Promise<void> {
    if (this.ready) return this.ready;
    const host = window.location.hostname;
    const configuredOrigin =
      process.env.NODE_ENV === "development"
        ? process.env.NEXT_PUBLIC_CHAIN_STORAGE_ORIGIN
        : undefined;
    this.origin =
      (configuredOrigin ? new URL(configuredOrigin).origin : undefined) ??
      (host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".localhost")
        ? `${window.location.protocol}//localhost${window.location.port ? ":" + window.location.port : ""}`
        : "https://eth.sh");
    if (window.location.origin === this.origin) {
      window.addEventListener("storage", this.localChange);
      return (this.ready = Promise.resolve());
    }
    // Never fall back to per-subdomain storage: that would silently split the catalog.
    window.addEventListener("message", this.message);
    this.ready = new Promise<void>((resolve, reject) => {
      const iframe = document.createElement("iframe");
      iframe.hidden = true;
      iframe.title = "Shared custom chain storage";
      iframe.src = `${this.origin}/_storage`;
      this.iframe = iframe;
      const timer = setTimeout(() => {
        window.removeEventListener("message", onReady);
        iframe.remove();
        this.iframe = null;
        this.ready = null;
        reject(
          new Error(
            "Unable to connect to shared chain storage. Please try again."
          )
        );
      }, 10000);
      const onReady = (event: MessageEvent) => {
        if (
          event.source !== iframe.contentWindow ||
          event.origin !== this.origin ||
          event.data?.type !== "STORAGE_HUB_READY"
        )
          return;
        clearTimeout(timer);
        window.removeEventListener("message", onReady);
        resolve();
      };
      window.addEventListener("message", onReady);
      document.body.appendChild(iframe);
    });
    return this.ready;
  }
  async request(
    action: CustomChainRequest["action"],
    payload?: unknown
  ): Promise<CustomChain[]> {
    await this.initialize();
    const request: CustomChainRequest = {
      namespace: CUSTOM_CHAINS_NAMESPACE,
      id: crypto.randomUUID(),
      action,
      payload,
    };
    let response: Response;
    if (window.location.origin === this.origin) {
      response = handleCustomChainRequest(localStorage, request);
    } else {
      response = await new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pending.delete(request.id);
          reject(new Error("Shared chain storage timed out."));
        }, 10000);
        this.pending.set(request.id, { resolve, reject, timer });
        this.iframe!.contentWindow!.postMessage(request, this.origin);
      });
    }
    if (!response.success || !response.data)
      throw new Error(response.error ?? "Unable to update saved chains.");
    const entries = parseCustomChains(response.data);
    if (action !== "GET_ALL") this.notify();
    return entries;
  }
}
export const customChainStorage = new CustomChainStorage();
