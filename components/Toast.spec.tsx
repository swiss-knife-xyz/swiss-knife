import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  Alert,
  ChakraProvider,
  useToast,
  type UseToastOptions,
} from "@chakra-ui/react";
import theme from "@/style/theme";
import { Toast, toastOptions } from "./Toast";

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addListener() {},
    removeListener() {},
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount(options: UseToastOptions = {}) {
  let toast!: ReturnType<typeof useToast>;
  function Controls() {
    toast = useToast();
    return <button onClick={() => toast(options)}>Notify</button>;
  }
  render(
    <ChakraProvider theme={theme} toastOptions={toastOptions}>
      <Controls />
      <Alert>Inline alert</Alert>
    </ChakraProvider>
  );
  return {
    getToast: () => toast,
    notify: () => fireEvent.click(screen.getByText("Notify")),
  };
}

it("styles existing useToast calls while preserving JSX, status, icon, placement and dismissal", async () => {
  const onCloseComplete = vi.fn();
  const { notify, getToast } = mount({
    id: "transaction",
    title: "Transaction sent",
    description: <a href="https://example.com/tx/123">View transaction</a>,
    status: "success",
    icon: <span>Custom status</span>,
    position: "top-right",
    duration: null,
    isClosable: true,
    onCloseComplete,
  });
  notify();
  const link = await screen.findByRole("link", { name: "View transaction" });
  expect(link.getAttribute("href")).toBe("https://example.com/tx/123");
  const toast = document.getElementById("toast-transaction")!;
  expect(toast.hasAttribute("data-app-toast")).toBe(true);
  expect(toast.dataset.status).toBe("success");
  expect(screen.getByText("Custom status")).toBeTruthy();
  expect(toast.closest('[id="chakra-toast-manager-top-right"]')).toBeTruthy();
  expect(getToast().isActive("transaction")).toBe(true);
  expect(screen.getByRole("alert").hasAttribute("data-app-toast")).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Close notification" }));
  await waitFor(() => expect(getToast().isActive("transaction")).toBe(false));
  await waitFor(() => expect(onCloseComplete).toHaveBeenCalledOnce());
});

it("keeps custom render callbacks and their actions ahead of the shared renderer", async () => {
  const undo = vi.fn();
  const { notify } = mount({
    duration: null,
    render: ({ onClose }) => (
      <button
        onClick={() => {
          undo();
          onClose();
        }}
      >
        Undo deletion
      </button>
    ),
  });
  notify();
  fireEvent.click(await screen.findByRole("button", { name: "Undo deletion" }));
  expect(undo).toHaveBeenCalledOnce();
  expect(document.querySelector("[data-app-toast]")).toBeNull();
  await waitFor(() => expect(screen.queryByText("Undo deletion")).toBeNull());
});

it("keeps the shared renderer when a loading notification is updated", async () => {
  const { notify, getToast } = mount({
    id: "progress",
    status: "loading",
    title: "Sending",
    duration: null,
  });
  notify();
  await screen.findByText("Sending");
  expect(document.querySelectorAll("[data-app-toast]").length).toBe(1);
  act(() =>
    getToast().update("progress", {
      status: "success",
      title: "Confirmed",
      duration: null,
    })
  );
  await screen.findByText("Confirmed");
  expect(document.getElementById("toast-progress")?.dataset.status).toBe(
    "success"
  );
  act(() => getToast().closeAll());
  await waitFor(() => expect(getToast().isActive("progress")).toBe(false));
});

it("preserves caller variants and automatic dismissal", async () => {
  const { notify, getToast } = mount({
    id: "temporary",
    title: "Saved",
    variant: "solid",
    duration: 50,
  });
  notify();
  await screen.findByText("Saved");
  expect(document.querySelector("[data-app-toast]")).toBeTruthy();
  await waitFor(() => expect(getToast().isActive("temporary")).toBe(false));
});

it("supports shared action content inside a custom renderer", async () => {
  const undo = vi.fn();
  const { notify } = mount({
    duration: null,
    render: ({ id, onClose }) => (
      <Toast
        id={id}
        description="File deleted"
        action={
          <button
            onClick={() => {
              undo();
              onClose();
            }}
          >
            Undo
          </button>
        }
      />
    ),
  });
  notify();
  await screen.findByText("File deleted");
  expect(document.querySelector("[data-app-toast]")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(undo).toHaveBeenCalledOnce();
  await waitFor(() => expect(screen.queryByText("File deleted")).toBeNull());
});

it("keeps promise notifications on the shared renderer", async () => {
  const { getToast } = mount();
  let resolve!: () => void;
  const pending = new Promise<void>((done) => {
    resolve = done;
  });
  act(() =>
    getToast().promise(pending, {
      loading: { title: "Waiting", duration: null },
      success: { title: "Complete", duration: null },
      error: { title: "Failed" },
    })
  );
  await screen.findByText("Waiting");
  await act(async () => {
    resolve();
    await pending;
  });
  await screen.findByText("Complete");
  expect(
    document.querySelector("[data-app-toast]")?.getAttribute("data-status")
  ).toBe("success");
  act(() => getToast().closeAll());
});
