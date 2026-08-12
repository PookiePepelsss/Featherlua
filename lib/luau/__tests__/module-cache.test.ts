import { describe, expect, it, vi } from "vitest";
import { isRuntimeCollapse, loadOnce } from "../official/module-cache";

// The compiler is fetched once and kept. Keeping a *failed* fetch is the
// trap: `cached ??= load()` stores the rejected promise, so one blip while
// downloading leaves every later attempt failing with the same stale error
// until the page is reloaded. Nothing tears the worker down, because the
// error is caught and reported properly, so nothing ever retries.

describe("loading once", () => {
  it("loads a single time and reuses the result", async () => {
    const load = vi.fn().mockResolvedValue("compiler");
    const { get } = loadOnce(load);

    expect(await get()).toBe("compiler");
    expect(await get()).toBe("compiler");
    expect(await get()).toBe("compiler");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("shares one load between callers that arrive together", async () => {
    const load = vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve("compiler"), 5)));
    const { get } = loadOnce(load);

    const results = await Promise.all([get(), get(), get()]);
    expect(results).toEqual(["compiler", "compiler", "compiler"]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not remember a failure", async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new Error("network died"))
      .mockResolvedValue("compiler");
    const { get } = loadOnce(load);

    await expect(get()).rejects.toThrow("network died");
    // The retry is the whole point: without it the tab stays broken.
    expect(await get()).toBe("compiler");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("keeps retrying while it keeps failing", async () => {
    const load = vi.fn().mockRejectedValue(new Error("still down"));
    const { get } = loadOnce(load);

    await expect(get()).rejects.toThrow("still down");
    await expect(get()).rejects.toThrow("still down");
    await expect(get()).rejects.toThrow("still down");
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("can be told to forget what it loaded", async () => {
    const load = vi.fn().mockResolvedValue("compiler");
    const cache = loadOnce(load);

    expect(await cache.get()).toBe("compiler");
    expect(load).toHaveBeenCalledTimes(1);

    // A WebAssembly instance that has aborted is unusable, so the worker
    // drops it and the next attempt builds a fresh one.
    cache.forget();
    expect(await cache.get()).toBe("compiler");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("settles on the first success after several failures", async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new Error("one"))
      .mockRejectedValueOnce(new Error("two"))
      .mockResolvedValue("compiler");
    const { get } = loadOnce(load);

    await expect(get()).rejects.toThrow("one");
    await expect(get()).rejects.toThrow("two");
    expect(await get()).toBe("compiler");
    expect(await get()).toBe("compiler");
    expect(load).toHaveBeenCalledTimes(3);
  });
});

// Emscripten aborts the whole instance rather than reporting a problem
// with the script, so these have to be told apart from ordinary errors:
// one means throw the compiler away, the other means show the message.
describe("telling a dead runtime from a bad script", () => {
  const COLLAPSED = [
    "memory access out of bounds",
    "Out of memory",
    "RuntimeError: unreachable",
    "table index is out of bounds",
    "abort(OOM) at Error",
  ];

  for (const message of COLLAPSED) {
    it(`treats "${message}" as a dead runtime`, () => {
      expect(isRuntimeCollapse(new Error(message))).toBe(true);
    });
  }

  const ORDINARY = [
    "Expected identifier when parsing expression",
    "Unexpected token 'end' (line 12, col 1)",
    "Official Luau compiler rejected the input",
    "Incomplete statement: expected assignment or a function call",
  ];

  for (const message of ORDINARY) {
    it(`leaves "${message.slice(0, 34)}" alone`, () => {
      expect(isRuntimeCollapse(new Error(message))).toBe(false);
    });
  }
});
