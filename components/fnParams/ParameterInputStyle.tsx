"use client";

import { createContext, useContext } from "react";

/** Compact presentation for editable contract parameters, including nested fields. */
export const CompactParameterInputs = createContext(false);
export const useCompactParameterInputs = () =>
  useContext(CompactParameterInputs);
