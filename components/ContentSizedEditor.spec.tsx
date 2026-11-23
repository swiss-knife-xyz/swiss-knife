import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { ContentSizedEditor } from "./ContentSizedEditor";

const mock = vi.hoisted(() => ({ props: undefined as any }));
vi.mock("@monaco-editor/react", () => ({ Editor: (props: any) => {
  mock.props = props;
  return <div data-testid="editor" style={{ height: props.height }} />;
} }));
afterEach(cleanup);
it("fits short content, grows to a cap, shrinks again and measures wrapped lines on layout", () => {
  const disposals = [vi.fn(), vi.fn()];
  let contentSize = () => {};
  let layout = () => {};
  let height = 104;
  const editor = {
    getContentHeight: () => height,
    onDidContentSizeChange: (callback: () => void) => { contentSize = callback; return { dispose: disposals[0] }; },
    onDidLayoutChange: (callback: () => void) => { layout = callback; return { dispose: disposals[1] }; },
  };
  const view = render(<ContentSizedEditor value={'[\n  "error Denied()"\n]'} />);
  act(() => mock.props.onMount(editor));
  expect(screen.getByTestId("editor").style.height).toBe("104px");
  act(() => { height = 300; contentSize(); });
  expect(screen.getByTestId("editor").style.height).toBe("300px");
  act(() => { height = 900; contentSize(); });
  expect(parseInt(screen.getByTestId("editor").style.height)).toBeLessThanOrEqual(420);
  act(() => { height = 146; layout(); });
  expect(screen.getByTestId("editor").style.height).toBe("146px");
  act(() => { height = 42; contentSize(); });
  expect(screen.getByTestId("editor").style.height).toBe("104px");
  view.unmount();
  disposals.forEach(dispose => expect(dispose).toHaveBeenCalledOnce());
});
