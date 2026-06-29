import { mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getProjectSourceStatus,
  readProjectSourceDoc,
  setProjectSourcesDataDirForTests,
  writeProjectSourceDoc,
  writeProjectSourceDocs,
} from "@/lib/project-sources";

let tmpDir = "";

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "carousel-sources-"));
  setProjectSourcesDataDirForTests(tmpDir);
});

afterEach(async () => {
  setProjectSourcesDataDirForTests(null);
  await rm(tmpDir, { recursive: true, force: true });
});

describe("project sources", () => {
  it("reports missing required source docs per project", async () => {
    const status = await getProjectSourceStatus("sample-pogon");

    expect(status.projectId).toBe("sample-pogon");
    expect(status.complete).toBe(false);
    expect(status.requiredMissing).toEqual(["brand", "design", "voice"]);
    expect(status.docs.find((doc) => doc.key === "brand")?.fileName).toBe("brand.md");
  });

  it("writes and reads project-scoped source docs", async () => {
    await writeProjectSourceDocs("sample-pogon", [
      { key: "brand", content: "# 포곤\n\n브랜드 기준" },
      { key: "voice", content: "# Voice\n\n차분한 문장" },
    ]);

    const pogonBrand = await readProjectSourceDoc("sample-pogon", "brand", {
      includeContent: true,
    });
    const otherBrand = await readProjectSourceDoc("other-project", "brand", {
      includeContent: true,
    });

    expect(pogonBrand.exists).toBe(true);
    expect(pogonBrand.content).toContain("포곤");
    expect(otherBrand.exists).toBe(false);
    expect(otherBrand.content).toBe("");
  });

  it("does not overwrite existing docs unless explicitly requested", async () => {
    await writeProjectSourceDoc("sample-pogon", "brand", "# First");

    await expect(
      writeProjectSourceDoc("sample-pogon", "brand", "# Second")
    ).rejects.toThrow("already exists");

    const updated = await writeProjectSourceDoc(
      "sample-pogon",
      "brand",
      "# Second",
      { overwrite: true }
    );
    expect(updated.content).toContain("Second");
  });

  it("rejects unsafe project ids", async () => {
    await expect(
      getProjectSourceStatus("../studio-soluta")
    ).rejects.toThrow("Invalid projectId");
  });
});
