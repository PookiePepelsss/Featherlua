import { describe, expect, it } from "vitest";
import { compressAggressive } from "../compress-aggressive";
import { parse } from "../parser";

function output(source: string): string {
  const result = compressAggressive(source, { hoistRepeatedAccess: true });
  if (!result.ok) throw new Error(`expected ok:true, got error: ${result.error.message}`);
  return result.output;
}

describe("hoist-repeated-access: off by default", () => {
  it("does nothing unless explicitly enabled", () => {
    const result = compressAggressive(
      "repeat local x = workspace.Terrain.Size.X + workspace.Terrain.Size.X until true",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).not.toContain("__hoist");
  });
});

describe("hoist-repeated-access: the motivating case", () => {
  it("hoists a chain read twice in a repeat loop to before it", () => {
    const out = output("repeat local x = workspace.Terrain.Size.X + workspace.Terrain.Size.X until true");
    expect(out).toMatch(/^local \w+=workspace\.Terrain\.Size\.X repeat local \w+=\w+\+\w+ until true$/);
  });

  it("hoists across a numeric-for loop with literal bounds", () => {
    const out = output("for i = 1, 10 do local x = workspace.Terrain.Size.X + workspace.Terrain.Size.X end");
    expect(out).toContain("workspace.Terrain.Size.X");
    // Hoisted local appears exactly once as an access; the loop uses the cache.
    expect((out.match(/workspace\.Terrain\.Size\.X/g) ?? []).length).toBe(1);
  });

  it("does not hoist a chain that only appears once", () => {
    const out = output("repeat local x = workspace.Terrain.Size.X until true");
    expect(out).toBe("repeat local a=workspace.Terrain.Size.X until true");
  });
});

describe("hoist-repeated-access: never touches calls or their arguments (remote args safety)", () => {
  it("never hoists a method call itself", () => {
    const out = output("repeat game:GetService('Players') game:GetService('Players') until true");
    expect(out).not.toContain("__hoist");
    expect((out.match(/GetService/g) ?? []).length).toBe(2);
  });

  it("a loop containing ANY call is skipped entirely, even for unrelated chains in the same loop", () => {
    // The presence of RemoteEvent:FireServer(...) anywhere in the loop
    // disqualifies hoisting for the whole loop -- workspace.Terrain.Size.X
    // is repeated twice here but must NOT be hoisted, because a call
    // anywhere in the zone could (for all this pass can prove) mutate
    // anything reachable from that chain.
    const out = output(
      "repeat remote:FireServer(workspace.Terrain.Size.X) print(workspace.Terrain.Size.X) until true",
    );
    expect(out).not.toContain("__hoist");
    expect(out).toContain("remote:FireServer(workspace.Terrain.Size.X)");
  });

  it("remote call arguments are never altered, deduplicated, or removed", () => {
    const source = "repeat remote:FireServer(1, 'a', workspace.Terrain.Size.X) until true";
    const withHoisting = compressAggressive(source, { hoistRepeatedAccess: true });
    const without = compressAggressive(source, { hoistRepeatedAccess: false });
    expect(withHoisting.ok && without.ok).toBe(true);
    if (!withHoisting.ok || !without.ok) return;
    // Identical either way: a lone call disqualifies its own loop from
    // hoisting, so enabling the flag changes nothing here.
    expect(withHoisting.output).toBe(without.output);
    expect(withHoisting.output).toContain("remote:FireServer(1,'a',workspace.Terrain.Size.X)");
  });
});

describe("hoist-repeated-access: safety boundaries", () => {
  it("does not hoist when the base name is ever declared as a local anywhere in the program", () => {
    const out = output(
      "local function f() local workspace = {} return workspace end\n" +
        "repeat print(workspace.Terrain.Size.X, workspace.Terrain.Size.X) until true",
    );
    // `workspace` is shadowed by a local elsewhere in the program, so its
    // name can't be trusted as unambiguously denoting the same global.
    expect(out).not.toContain("__hoist");
  });

  it("does not hoist when the base name is ever an assignment target anywhere in the program", () => {
    const out = output(
      "workspace = nil\nrepeat print(workspace.Terrain.Size.X, workspace.Terrain.Size.X) until true",
    );
    expect(out).not.toContain("__hoist");
  });

  it("does not hoist from a while loop (can't prove it runs at least once)", () => {
    const out = output("while cond do print(workspace.Terrain.Size.X, workspace.Terrain.Size.X) end");
    expect(out).not.toContain("__hoist");
  });

  it("does not hoist from a generic-for loop (can't prove it runs at least once)", () => {
    const out = output("for k, v in pairs(t) do print(workspace.Terrain.Size.X, workspace.Terrain.Size.X) end");
    expect(out).not.toContain("__hoist");
  });

  it("does not hoist a numeric-for with non-literal bounds", () => {
    const out = output("for i = a, b do print(workspace.Terrain.Size.X, workspace.Terrain.Size.X) end");
    expect(out).not.toContain("__hoist");
  });

  it("does not hoist a numeric-for that provably runs zero times", () => {
    const out = output("for i = 10, 1 do print(workspace.Terrain.Size.X, workspace.Terrain.Size.X) end");
    expect(out).not.toContain("__hoist");
  });

  it("does not hoist an occurrence reached only conditionally", () => {
    const out = output(
      "repeat\n  print(workspace.Terrain.Size.X)\n  if cond then print(workspace.Terrain.Size.X) end\nuntil true",
    );
    // Only one UNCONDITIONAL occurrence exists (the conditional one is
    // never counted or replaced), so this never reaches the 2-occurrence
    // threshold and nothing is hoisted.
    expect(out).not.toContain("__hoist");
  });

  it("never hoists a computed index, only plain `.name` chains", () => {
    const out = output(
      "repeat print(workspace['Terrain'].Size, workspace['Terrain'].Size) until true",
    );
    expect(out).not.toContain("__hoist");
  });

  it("output remains valid, re-parseable Luau", () => {
    const result = compressAggressive(
      "repeat local x = workspace.Terrain.Size.X + workspace.Terrain.Size.X until true",
      { hoistRepeatedAccess: true },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(() => parse(result.output)).not.toThrow();
  });
});
