import { afterEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { ResizableImage } from "./ResizableImage";
import { getIPFSGatewayUrls } from "@/lib/ipfs";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("preserves IPFS paths and only rewrites recognized gateways", () => {
  const urls = getIPFSGatewayUrls("IPFS://ipfs/bafytest/a.png?q=1#image");
  expect(urls).toHaveLength(3);
  expect(urls[1]).toBe(
    "https://ipfs.filebase.io/ipfs/bafytest/a.png?q=1#image"
  );
  expect(getIPFSGatewayUrls(urls[0])).toEqual(urls);
  expect(getIPFSGatewayUrls("https://example.com/ipfs/test")).toEqual([
    "https://example.com/ipfs/test",
  ]);
});

it("advances images on errors and timeouts, then stops after success", () => {
  vi.useFakeTimers();
  const loaded = vi.fn();
  render(
    <ChakraProvider>
      <ResizableImage
        src="https://one.test/a.png"
        fallbackSrcs={["https://two.test/a.png", "https://three.test/a.png"]}
        onSourceLoad={loaded}
      />
    </ChakraProvider>
  );
  fireEvent.error(screen.getByAltText("Image preview"));
  expect(screen.getByAltText("Image preview").getAttribute("src")).toBe(
    "https://two.test/a.png"
  );
  act(() => vi.advanceTimersByTime(8000));
  expect(screen.getByAltText("Image preview").getAttribute("src")).toBe(
    "https://three.test/a.png"
  );
  fireEvent.load(screen.getByAltText("Image preview"));
  act(() => vi.advanceTimersByTime(16000));
  expect(loaded).toHaveBeenCalledWith("https://three.test/a.png");
  expect(screen.queryByText("Image unavailable")).toBeNull();
});

it("shows an error after image gateways are exhausted and resets for a new source", () => {
  const view = render(
    <ChakraProvider>
      <ResizableImage
        src="https://one.test/a.png"
        fallbackSrcs={["https://two.test/a.png"]}
      />
    </ChakraProvider>
  );
  fireEvent.error(screen.getByAltText("Image preview"));
  fireEvent.error(screen.getByAltText("Image preview"));
  expect(screen.getByText("Image unavailable")).toBeTruthy();
  view.rerender(
    <ChakraProvider>
      <ResizableImage src="https://new.test/a.png" />
    </ChakraProvider>
  );
  expect(screen.getByAltText("Image preview").getAttribute("src")).toBe(
    "https://new.test/a.png"
  );
});
