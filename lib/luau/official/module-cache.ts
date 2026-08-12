export interface LoadedOnce<T> {
  /** The value, loading it the first time and on any attempt after a failure. */
  get(): Promise<T>;
  /** Throw away what was loaded, so the next `get` builds it again. */
  forget(): void;
}

/**
 * Loads something once and remembers it, but never remembers a failure and
 * can be told to forget a success.
 *
 * The obvious spelling, `cached ??= load()`, keeps the rejected promise
 * when a load goes wrong, so one network blip while fetching the compiler
 * leaves every later attempt failing with the same stale error for as long
 * as the page lives: the error is reported and handled, so nothing tears
 * anything down and nothing tries again.
 *
 * `forget` exists for the other half of that problem. A WebAssembly module
 * that has aborted, by running out of memory on a very large script, stays
 * broken for every call afterwards. Dropping it lets the next attempt
 * start from a clean one instead of failing forever.
 */
export function loadOnce<T>(load: () => Promise<T>): LoadedOnce<T> {
  let pending: Promise<T> | undefined;
  return {
    get() {
      pending ??= load().catch((error: unknown) => {
        pending = undefined;
        throw error;
      });
      return pending;
    },
    forget() {
      pending = undefined;
    },
  };
}

/**
 * True for the kind of failure that leaves the WebAssembly module unusable
 * rather than merely reporting a problem with the script. Emscripten aborts
 * the whole instance, so every later call fails the same way.
 */
export function isRuntimeCollapse(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /memory access out of bounds|out of memory|unreachable|table index is out of bounds|abort\(|RuntimeError/i.test(message);
}
