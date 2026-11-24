"use client";

import { createContext, useContext } from "react";

// Kept separate from Layout so pages can read the slot without importing the
// Navbar/Footer module graph.
export const BeforeFooterSlotContext = createContext<HTMLElement | null>(null);

/**
 * The element directly above the sitewide footer when the nearest Layout
 * enabled `beforeFooterSlot`; otherwise null so callers can render inline.
 */
export const useBeforeFooterSlot = () => useContext(BeforeFooterSlotContext);
