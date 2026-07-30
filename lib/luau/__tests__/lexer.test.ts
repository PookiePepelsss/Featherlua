import { describe, expect, it } from "vitest";
import { tokenize } from "../lexer";

function texts(source: string) {
  return tokenize(source).tokens.map((t) => `${t.kind}:${t.text}`);
}

describe("lexer: non-interpolated subset", () => {
  it("tokenizes keywords vs identifiers", () => {
    expect(texts("local x = if")).toEqual([
      "Keyword:local", "Name:x", "Symbol:=", "Keyword:if", "Eof:",
    ]);
  });

  it("treats soft keywords as plain names", () => {
    expect(texts("continue type export")).toEqual([
      "Name:continue", "Name:type", "Name:export", "Eof:",
    ]);
  });

  it("tokenizes numbers (hex float, binary, underscore, leading dot)", () => {
    expect(texts("0x1A.8p2 0b1010 123_456 .5e-3")).toEqual([
      "Number:0x1A.8p2", "Number:0b1010", "Number:123_456", "Number:.5e-3", "Eof:",
    ]);
  });

  it("tokenizes quoted strings with escapes verbatim", () => {
    const toks = tokenize(`local s = "hello \\"world\\""`).tokens;
    expect(toks[3]).toMatchObject({ kind: "String", text: `"hello \\"world\\""` });
  });

  it("tokenizes long-bracket strings with = levels", () => {
    const toks = tokenize("local s = [==[ raw ]] string ]==]").tokens;
    expect(toks[3]).toMatchObject({ kind: "LongString", text: "[==[ raw ]] string ]==]" });
  });

  it("collects license comments as protected, discards normal comments as no token", () => {
    const result = tokenize("-- @license MIT\nlocal x = 1 -- trailing\n");
    expect(result.protectedComments).toEqual(["-- @license MIT"]);
    expect(result.tokens.map((t) => t.kind)).toEqual(["Keyword", "Name", "Symbol", "Number", "Eof"]);
  });

  it("preserves shebang as a protected comment", () => {
    const result = tokenize("#!/usr/bin/env luau\nlocal x = 1");
    expect(result.protectedComments).toEqual(["#!/usr/bin/env luau"]);
  });

  it("tokenizes compound operators longest-match first", () => {
    expect(texts("a ..= b .. c ... d")).toEqual([
      "Name:a", "Symbol:..=", "Name:b", "Symbol:..", "Name:c", "Symbol:...", "Name:d", "Eof:",
    ]);
  });

  it("tokenizes goto labels and the :: symbol", () => {
    expect(texts("::top:: goto top")).toEqual([
      "Symbol:::", "Name:top", "Symbol:::", "Keyword:goto", "Name:top", "Eof:",
    ]);
  });

  it("tracks line/col across newlines", () => {
    const toks = tokenize("local x\nlocal y").tokens;
    const y = toks.find((t) => t.text === "y")!;
    expect(y.line).toBe(2);
    expect(y.col).toBe(7);
  });
});

describe("lexer: interpolated strings", () => {
  it("tokenizes a plain backtick string as a single segment", () => {
    const toks = tokenize("`hello world`").tokens;
    expect(toks).toMatchObject([
      { kind: "InterpStringSegment", text: "hello world", isFirst: true, isLast: true },
      { kind: "Eof" },
    ]);
  });

  it("emits real tokens for a single interpolation expression", () => {
    const toks = tokenize("`sum={1+2}`").tokens;
    expect(toks).toMatchObject([
      { kind: "InterpStringSegment", text: "sum=", isFirst: true, isLast: false },
      { kind: "Number", text: "1" },
      { kind: "Symbol", text: "+" },
      { kind: "Number", text: "2" },
      { kind: "InterpStringSegment", text: "", isFirst: false, isLast: true },
      { kind: "Eof" },
    ]);
  });

  it("tracks brace depth through a table constructor inside an interpolation", () => {
    const toks = tokenize("`{ {1,2,3}[1] }`").tokens;
    const kinds = toks.map((t) => `${t.kind}:${t.text}`);
    expect(kinds).toEqual([
      "InterpStringSegment:",
      "Symbol:{", "Number:1", "Symbol:,", "Number:2", "Symbol:,", "Number:3", "Symbol:}",
      "Symbol:[", "Number:1", "Symbol:]",
      "InterpStringSegment:",
      "Eof:",
    ]);
  });

  it("handles nested interpolated strings inside an interpolation expression", () => {
    const toks = tokenize("`outer {`inner {x}`} tail`").tokens;
    const kinds = toks.map((t) => `${t.kind}:${t.text}`);
    expect(kinds).toEqual([
      "InterpStringSegment:outer ",
      "InterpStringSegment:inner ",
      "Name:x",
      "InterpStringSegment:",
      "InterpStringSegment: tail",
      "Eof:",
    ]);
  });

  it("does not choke on a comment inside an interpolation expression", () => {
    const toks = tokenize("`v={ --[[c]] 1 }`").tokens;
    const kinds = toks.map((t) => `${t.kind}:${t.text}`);
    expect(kinds).toEqual(["InterpStringSegment:v=", "Number:1", "InterpStringSegment:", "Eof:"]);
  });
});
