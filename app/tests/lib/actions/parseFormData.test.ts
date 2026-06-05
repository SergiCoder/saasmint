import { describe, it, expect } from "vitest";
import {
  getString,
  getNonEmptyString,
  getInt,
  getFile,
} from "@/lib/actions/parseFormData";

function fd(entries: Array<[string, string | File]>): FormData {
  const f = new FormData();
  for (const [k, v] of entries) f.append(k, v);
  return f;
}

describe("getString", () => {
  it("returns the string value when set", () => {
    expect(getString(fd([["name", "Ada"]]), "name")).toBe("Ada");
  });

  it("returns an empty string as-is (does not coerce to undefined)", () => {
    expect(getString(fd([["name", ""]]), "name")).toBe("");
  });

  it("returns undefined when the key is missing", () => {
    expect(getString(new FormData(), "missing")).toBeUndefined();
  });

  it("returns undefined when the value is a File (non-string entry)", () => {
    const file = new File(["hi"], "hi.txt", { type: "text/plain" });
    expect(getString(fd([["upload", file]]), "upload")).toBeUndefined();
  });
});

describe("getNonEmptyString", () => {
  it("returns the value when non-empty", () => {
    expect(getNonEmptyString(fd([["name", "Ada"]]), "name")).toBe("Ada");
  });

  it("returns undefined for an empty string", () => {
    expect(getNonEmptyString(fd([["name", ""]]), "name")).toBeUndefined();
  });

  it("returns undefined when missing", () => {
    expect(getNonEmptyString(new FormData(), "name")).toBeUndefined();
  });

  it("returns undefined when the value is a File", () => {
    const file = new File(["hi"], "hi.txt", { type: "text/plain" });
    expect(getNonEmptyString(fd([["upload", file]]), "upload")).toBeUndefined();
  });
});

describe("getInt", () => {
  it("parses a numeric string", () => {
    expect(getInt(fd([["qty", "42"]]), "qty")).toBe(42);
  });

  it("parses a negative integer", () => {
    expect(getInt(fd([["n", "-7"]]), "n")).toBe(-7);
  });

  it("truncates a decimal to the leading integer (parseInt semantics)", () => {
    expect(getInt(fd([["n", "3.9"]]), "n")).toBe(3);
  });

  it("returns undefined when the key is missing", () => {
    expect(getInt(new FormData(), "missing")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(getInt(fd([["n", ""]]), "n")).toBeUndefined();
  });

  it("returns undefined for a non-numeric string", () => {
    expect(getInt(fd([["n", "abc"]]), "n")).toBeUndefined();
  });
});

describe("getFile", () => {
  it("returns the File when a non-empty file is set", () => {
    const file = new File(["hi"], "hi.txt", { type: "text/plain" });
    expect(getFile(fd([["upload", file]]), "upload")).toBe(file);
  });

  it("returns undefined when the file has size 0", () => {
    const emptyFile = new File([], "empty.txt", { type: "text/plain" });
    expect(getFile(fd([["upload", emptyFile]]), "upload")).toBeUndefined();
  });

  it("returns undefined when the key is missing", () => {
    expect(getFile(new FormData(), "upload")).toBeUndefined();
  });

  it("returns undefined when the value is a string", () => {
    expect(getFile(fd([["upload", "not-a-file"]]), "upload")).toBeUndefined();
  });
});
