"use client";

import { getPath } from "@/utils";
import subdomains from "@/subdomains";
import type { SharedSignaturePayload } from "./components/types";

const PAYLOAD_PARAM = "payload";
const RETURN_PARAMS_PARAM = "returnParams";

export type SignatureViewParams = {
  payload: string | null;
  returnParams: string | null;
};

type SearchParamsLike = Pick<URLSearchParams, "get">;

export const encodeSignaturePayload = (
  payload: SharedSignaturePayload
): string => {
  const jsonString = JSON.stringify(payload);
  const base64String = btoa(jsonString);
  return encodeURIComponent(base64String);
};

export const decodeSignaturePayload = (
  encodedData: string
): SharedSignaturePayload | null => {
  try {
    const base64String = decodeURIComponent(encodedData);
    const jsonString = atob(base64String);
    return JSON.parse(jsonString) as SharedSignaturePayload;
  } catch (error) {
    console.error("Failed to decode or parse signature payload:", error);
    if (
      error instanceof DOMException &&
      error.name === "InvalidCharacterError"
    ) {
      console.error(
        "Error during atob(): Input may not be a valid Base64 string."
      );
    }
    return null;
  }
};

export const buildSignatureViewUrl = (
  payload: SharedSignaturePayload,
  returnParams?: string
): string => {
  const hashParams = new URLSearchParams();
  hashParams.set(PAYLOAD_PARAM, encodeSignaturePayload(payload));
  if (returnParams) {
    hashParams.set(RETURN_PARAMS_PARAM, returnParams);
  }

  return `${getPath(subdomains.WALLET.base)}signatures/view#${hashParams.toString()}`;
};

export const getSignatureViewParams = (
  searchParams: SearchParamsLike,
  hash: string
): SignatureViewParams => {
  const hashParams = getParamsFromHash(hash);

  return {
    payload: hashParams.get(PAYLOAD_PARAM) ?? searchParams.get(PAYLOAD_PARAM),
    returnParams:
      hashParams.get(RETURN_PARAMS_PARAM) ??
      searchParams.get(RETURN_PARAMS_PARAM),
  };
};

const getParamsFromHash = (hash: string): URLSearchParams => {
  const hashContent = hash.startsWith("#") ? hash.slice(1) : hash;
  const queryString = hashContent.includes("?")
    ? hashContent.split("?")[1]
    : hashContent;

  return new URLSearchParams(queryString);
};
