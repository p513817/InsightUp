import { describe, expect, it } from "vitest";
import { isOversizedScanUpload } from "@/lib/inbody/scan-upload";

describe("isOversizedScanUpload", () => {
  it("allows requests without a content-length header", () => {
    expect(isOversizedScanUpload(null)).toBe(false);
  });

  it("ignores invalid content-length values", () => {
    expect(isOversizedScanUpload("not-a-number")).toBe(false);
    expect(isOversizedScanUpload("-1")).toBe(false);
  });

  it("rejects multipart bodies that exceed the file limit plus bounded overhead", () => {
    expect(isOversizedScanUpload(String(10 * 1024 * 1024 + 256 * 1024))).toBe(false);
    expect(isOversizedScanUpload(String(10 * 1024 * 1024 + 256 * 1024 + 1))).toBe(true);
  });
});
