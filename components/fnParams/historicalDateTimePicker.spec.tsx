import React, { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { HistoricalDateTimePicker } from "./HistoricalDateTimePicker";

afterEach(cleanup);
function Picker({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <ChakraProvider>
      <HistoricalDateTimePicker
        value={value}
        onChange={setValue}
        isDisabled={false}
      />
      <button onClick={() => setValue("")}>Clear</button>
      <output aria-label="Configured UTC time">{value}</output>
    </ChakraProvider>
  );
}
it("serializes a selected leap day and AM/PM time as UTC, with no native datetime picker", async () => {
  const { container } = render(<Picker />);
  expect(container.querySelector('input[type="datetime-local"]')).toBeNull();
  fireEvent.change(screen.getByRole("combobox", { name: "Year" }), {
    target: { value: "2024" },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Month" }), {
    target: { value: "1" },
  });
  fireEvent.click(
    await screen.findByRole("button", { name: "29 February 2024" })
  );
  for (const [name, value] of [
    ["Hours (UTC)", "11"],
    ["Minutes", "59"],
    ["Seconds", "58"],
  ]) {
    fireEvent.change(screen.getByLabelText(name), { target: { value } });
  }
  fireEvent.change(screen.getByRole("combobox", { name: "AM/PM" }), {
    target: { value: "PM" },
  });
  expect(screen.getByLabelText("Configured UTC time").textContent).toBe(
    "2024-02-29T23:59:58"
  );
  fireEvent.click(screen.getByRole("button", { name: "Clear" }));
  expect(screen.getByLabelText("Configured UTC time").textContent).toBe("");
  expect((screen.getByLabelText("Hours (UTC)") as HTMLInputElement).value).toBe(
    "12"
  );
});
it("pads a time segment on blur and preserves the selected day", () => {
  let changed = "";
  render(
    <ChakraProvider>
      <HistoricalDateTimePicker
        value="2024-02-29T01:02:03"
        onChange={(value) => {
          changed = value;
        }}
        isDisabled={false}
      />
    </ChakraProvider>
  );
  const hour = screen.getByLabelText("Hours (UTC)");
  fireEvent.change(hour, { target: { value: "7" } });
  expect(changed).toBe("2024-02-29T07:02:03");
  fireEvent.blur(hour, { target: { value: "7" } });
  expect(changed).toBe("2024-02-29T07:02:03");
});

it("ignores an invalid draft during a block-to-time settings transition", () => {
  render(
    <ChakraProvider>
      <HistoricalDateTimePicker
        value="100"
        onChange={() => {}}
        isDisabled={false}
      />
    </ChakraProvider>
  );
  expect(screen.getByRole("combobox", { name: "Year" })).toBeTruthy();
  expect((screen.getByLabelText("Hours (UTC)") as HTMLInputElement).value).toBe(
    "12"
  );
});

it("converts noon and midnight correctly without changing the UTC day", () => {
  render(<Picker initial="2024-02-29T00:02:03" />);
  const period = screen.getByRole("combobox", { name: "AM/PM" });
  expect((screen.getByLabelText("Hours (UTC)") as HTMLInputElement).value).toBe(
    "12"
  );
  fireEvent.change(period, { target: { value: "PM" } });
  expect(screen.getByLabelText("Configured UTC time").textContent).toBe(
    "2024-02-29T12:02:03"
  );
  fireEvent.change(screen.getByLabelText("Hours (UTC)"), {
    target: { value: "1" },
  });
  expect(screen.getByLabelText("Configured UTC time").textContent).toBe(
    "2024-02-29T13:02:03"
  );
  fireEvent.change(period, { target: { value: "AM" } });
  expect(screen.getByLabelText("Configured UTC time").textContent).toBe(
    "2024-02-29T01:02:03"
  );
  fireEvent.change(screen.getByLabelText("Hours (UTC)"), {
    target: { value: "12" },
  });
  expect(screen.getByLabelText("Configured UTC time").textContent).toBe(
    "2024-02-29T00:02:03"
  );
  const hour = screen.getByLabelText("Hours (UTC)");
  fireEvent.focus(hour);
  fireEvent.change(hour, { target: { value: "" } });
  fireEvent.blur(hour);
  fireEvent.click(screen.getByRole("button", { name: "Clear" }));
  expect((screen.getByLabelText("Hours (UTC)") as HTMLInputElement).value).toBe("12");
  expect((period as HTMLSelectElement).value).toBe("AM");
});
