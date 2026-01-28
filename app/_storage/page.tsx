"use client";

import { useEffect } from "react";
import type {
  StorageRequest,
  StorageResponse,
  SavedAddressInfo,
} from "@/types/addressBook";

const STORAGE_KEY = "global-address-book";

export default function StorageHubPage() {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate message structure
      if (!event.data || typeof event.data !== "object" || !event.data.id) {
        return;
      }

      const request = event.data as StorageRequest;
      let response: StorageResponse;

      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        let addresses: SavedAddressInfo[] = stored ? JSON.parse(stored) : [];

        switch (request.action) {
          case "GET_ALL":
            response = {
              id: request.id,
              success: true,
              data: addresses,
            };
            break;

          case "ADD":
            const newAddress = request.payload as SavedAddressInfo;
            // Check for duplicate address
            const existingIndex = addresses.findIndex(
              (a) => a.address.toLowerCase() === newAddress.address.toLowerCase()
            );
            if (existingIndex >= 0) {
              // Update existing entry
              addresses[existingIndex] = {
                ...addresses[existingIndex],
                label: newAddress.label,
                updatedAt: Date.now(),
              };
            } else {
              addresses.push(newAddress);
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
            response = {
              id: request.id,
              success: true,
              data: addresses,
            };
            break;

          case "REMOVE":
            const addressToRemove = request.payload as string;
            addresses = addresses.filter(
              (a) => a.address.toLowerCase() !== addressToRemove.toLowerCase()
            );
            localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
            response = {
              id: request.id,
              success: true,
              data: addresses,
            };
            break;

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
              response = {
                id: request.id,
                success: true,
                data: addresses,
              };
            } else {
              response = {
                id: request.id,
                success: false,
                error: "Address not found",
              };
            }
            break;

          default:
            response = {
              id: request.id,
              success: false,
              error: "Unknown action",
            };
        }
      } catch (error) {
        response = {
          id: request.id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }

      // Send response back to parent
      if (event.source && typeof event.source.postMessage === "function") {
        (event.source as WindowProxy).postMessage(response, "*");
      }
    };

    window.addEventListener("message", handleMessage);

    // Notify parent that we're ready
    if (window.parent !== window) {
      window.parent.postMessage({ type: "STORAGE_HUB_READY" }, "*");
    }

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // This page is meant to be loaded in a hidden iframe
  return null;
}
