import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useDebounced } from "./useDebounced";

describe("useDebounced", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the latest value only after the delay elapses", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => useDebounced(v, 160), {
      initialProps: { v: "a" },
    });
    expect(result.current).toBe("a");

    rerender({ v: "b" });
    // The new value is withheld until the debounce timer fires.
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(result.current).toBe("b");
  });
});
