import type {
  SavedAddressInfo,
  StorageRequest,
  StorageResponse,
} from "@/types/addressBook";

const STORAGE_KEY = "global-address-book";
const LEGACY_STORAGE_KEY = "address-book";
const IFRAME_ORIGIN = "https://eth.sh";
const IFRAME_PATH = "/_storage";

type PendingRequest = {
  resolve: (response: StorageResponse) => void;
  reject: (error: Error) => void;
};

class StorageHubClient {
  private iframe: HTMLIFrameElement | null = null;
  private isReady = false;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private messageQueue: Array<{
    request: StorageRequest;
    resolve: (response: StorageResponse) => void;
    reject: (error: Error) => void;
  }> = [];
  private readyPromise: Promise<void> | null = null;
  private isDevelopment = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.isDevelopment =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private handleMessage = (event: MessageEvent) => {
    // In production, verify origin
    if (!this.isDevelopment && event.origin !== IFRAME_ORIGIN) {
      return;
    }

    const data = event.data;

    // Check for ready signal
    if (data && data.type === "STORAGE_HUB_READY") {
      this.isReady = true;
      this.flushMessageQueue();
      return;
    }

    // Handle response
    if (data && data.id) {
      const response = data as StorageResponse;
      const pending = this.pendingRequests.get(response.id);
      if (pending) {
        this.pendingRequests.delete(response.id);
        pending.resolve(response);
      }
    }
  };

  private flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const queued = this.messageQueue.shift();
      if (queued) {
        this.sendMessage(queued.request)
          .then(queued.resolve)
          .catch(queued.reject);
      }
    }
  }

  async initialize(): Promise<void> {
    if (this.readyPromise) {
      return this.readyPromise;
    }

    // In development, use localStorage directly
    if (this.isDevelopment) {
      this.isReady = true;
      this.migrateLocalData();
      return Promise.resolve();
    }

    this.readyPromise = new Promise((resolve, reject) => {
      // Set up message listener
      window.addEventListener("message", this.handleMessage);

      // Create iframe
      this.iframe = document.createElement("iframe");
      this.iframe.style.display = "none";
      this.iframe.src = `${IFRAME_ORIGIN}${IFRAME_PATH}`;
      document.body.appendChild(this.iframe);

      // Timeout for iframe loading
      const timeout = setTimeout(() => {
        if (!this.isReady) {
          console.warn(
            "Storage hub iframe failed to load, falling back to local storage"
          );
          this.isReady = true;
          this.isDevelopment = true; // Fallback to local storage
          this.migrateLocalData();
          resolve();
        }
      }, 5000);

      // Wait for ready signal
      const checkReady = setInterval(() => {
        if (this.isReady) {
          clearInterval(checkReady);
          clearTimeout(timeout);
          resolve();
        }
      }, 100);
    });

    return this.readyPromise;
  }

  private migrateLocalData() {
    // Migrate data from legacy storage key if exists
    try {
      const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
      const currentData = localStorage.getItem(STORAGE_KEY);

      if (legacyData && !currentData) {
        const legacyAddresses = JSON.parse(legacyData) as Array<{
          address: string;
          label: string;
        }>;
        const migratedAddresses: SavedAddressInfo[] = legacyAddresses.map(
          (item) => ({
            address: item.address,
            label: item.label,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedAddresses));
      }
    } catch (error) {
      console.error("Error migrating legacy address book data:", error);
    }
  }

  private sendMessage(request: StorageRequest): Promise<StorageResponse> {
    return new Promise((resolve, reject) => {
      // In development, handle locally
      if (this.isDevelopment) {
        this.handleLocalRequest(request).then(resolve).catch(reject);
        return;
      }

      if (!this.isReady) {
        this.messageQueue.push({ request, resolve, reject });
        return;
      }

      if (!this.iframe || !this.iframe.contentWindow) {
        reject(new Error("Storage hub not initialized"));
        return;
      }

      this.pendingRequests.set(request.id, { resolve, reject });

      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(request.id)) {
          this.pendingRequests.delete(request.id);
          reject(new Error("Request timeout"));
        }
      }, 10000);

      this.iframe.contentWindow.postMessage(request, IFRAME_ORIGIN);
    });
  }

  private async handleLocalRequest(
    request: StorageRequest
  ): Promise<StorageResponse> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let addresses: SavedAddressInfo[] = stored ? JSON.parse(stored) : [];

      switch (request.action) {
        case "GET_ALL":
          return { id: request.id, success: true, data: addresses };

        case "ADD":
          const newAddress = request.payload as SavedAddressInfo;
          const existingIndex = addresses.findIndex(
            (a) => a.address.toLowerCase() === newAddress.address.toLowerCase()
          );
          if (existingIndex >= 0) {
            addresses[existingIndex] = {
              ...addresses[existingIndex],
              label: newAddress.label,
              updatedAt: Date.now(),
            };
          } else {
            addresses.push(newAddress);
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
          return { id: request.id, success: true, data: addresses };

        case "REMOVE":
          const addressToRemove = request.payload as string;
          addresses = addresses.filter(
            (a) => a.address.toLowerCase() !== addressToRemove.toLowerCase()
          );
          localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
          return { id: request.id, success: true, data: addresses };

        case "UPDATE":
          const updatePayload = request.payload as {
            address: string;
            label: string;
          };
          const updateIndex = addresses.findIndex(
            (a) =>
              a.address.toLowerCase() === updatePayload.address.toLowerCase()
          );
          if (updateIndex >= 0) {
            addresses[updateIndex] = {
              ...addresses[updateIndex],
              label: updatePayload.label,
              updatedAt: Date.now(),
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
            return { id: request.id, success: true, data: addresses };
          }
          return { id: request.id, success: false, error: "Address not found" };

        default:
          return { id: request.id, success: false, error: "Unknown action" };
      }
    } catch (error) {
      return {
        id: request.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getAll(): Promise<SavedAddressInfo[]> {
    const response = await this.sendMessage({
      id: this.generateId(),
      action: "GET_ALL",
    });
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || "Failed to get addresses");
  }

  async add(address: SavedAddressInfo): Promise<SavedAddressInfo[]> {
    const response = await this.sendMessage({
      id: this.generateId(),
      action: "ADD",
      payload: address,
    });
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || "Failed to add address");
  }

  async remove(address: string): Promise<SavedAddressInfo[]> {
    const response = await this.sendMessage({
      id: this.generateId(),
      action: "REMOVE",
      payload: address,
    });
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || "Failed to remove address");
  }

  async update(address: string, label: string): Promise<SavedAddressInfo[]> {
    const response = await this.sendMessage({
      id: this.generateId(),
      action: "UPDATE",
      payload: { address, label },
    });
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || "Failed to update address");
  }

  destroy() {
    window.removeEventListener("message", this.handleMessage);
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }
    this.iframe = null;
    this.isReady = false;
    this.readyPromise = null;
    this.pendingRequests.clear();
    this.messageQueue = [];
  }
}

// Singleton instance
let storageHubInstance: StorageHubClient | null = null;

export function getStorageHub(): StorageHubClient {
  if (!storageHubInstance) {
    storageHubInstance = new StorageHubClient();
  }
  return storageHubInstance;
}

export { StorageHubClient };
