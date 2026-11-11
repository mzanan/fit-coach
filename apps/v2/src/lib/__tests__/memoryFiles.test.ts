import { describe, expect, it } from "vitest";

import { MEMORY_FILE_MAX_CHARS } from "@/lib/constants";
import { filesForLocation, memoryCities, memoryIndexLines, memoryIndexText } from "@/lib/memory/memoryIndex";
import { cityFolder, movedPath, normalizeMemoryPath } from "@/lib/memory/memoryPath";
import { entryText, folderListing, insertAtLine, replaceOnce, sizeError, viewFileText } from "@/lib/memory/memoryText";

const diet = { path: "/memories/diet.md", content: "# Diet: defaults\n- 2026-10-12: Lunch protein 60 g or more." };
const daNang = { path: "/memories/da_nang/restaurants.md", content: "# Restaurants\n- 2026-10-12: Lunch by Grab only." };
const hanoi = { path: "/memories/hanoi/restaurants.md", content: "# Restaurants\n- 2026-11-01: Pho near the hotel." };

describe("normalizeMemoryPath", () => {
  it("keeps paths under /memories and collapses slashes", () => {
    expect(normalizeMemoryPath("/memories//diet.md")).toEqual({ ok: true, path: "/memories/diet.md" });
    expect(normalizeMemoryPath("/memories/")).toEqual({ ok: true, path: "/memories" });
  });

  it("rejects traversal, encoded traversal and other roots", () => {
    for (const raw of [
      "/memories/../../secrets.env",
      "/memories/%2e%2e/secrets.env",
      "/memories/..%2fsecrets.env",
      "/memories\\..\\x",
      "/etc/passwd",
      "memories/diet.md",
      "/memoriesx/diet.md",
    ]) {
      expect(normalizeMemoryPath(raw).ok).toBe(false);
    }
  });
});

describe("city folders", () => {
  it("reads the city only from a folder under the root", () => {
    expect(cityFolder(diet.path)).toBeNull();
    expect(cityFolder(daNang.path)).toBe("da_nang");
    expect(memoryCities([diet, daNang, hanoi])).toEqual(["da_nang", "hanoi"]);
  });

  it("shows general files plus the current city only", () => {
    expect(filesForLocation([diet, daNang, hanoi], "danang").map((file) => file.path)).toEqual([diet.path, daNang.path]);
    expect(filesForLocation([diet, daNang, hanoi], null)).toHaveLength(3);
  });

  it("moves a file or a whole folder", () => {
    expect(movedPath("/memories/da_nang/restaurants.md", "/memories/da_nang", "/memories/hoi_an")).toBe(
      "/memories/hoi_an/restaurants.md",
    );
    expect(movedPath(diet.path, diet.path, "/memories/food.md")).toBe("/memories/food.md");
  });
});

describe("memory index", () => {
  it("lists each file with its title, sorted by path", () => {
    expect(memoryIndexLines([diet, daNang])).toEqual([
      "- /memories/da_nang/restaurants.md: Restaurants",
      "- /memories/diet.md: Diet: defaults",
    ]);
  });

  it("says so when there is no file", () => {
    expect(memoryIndexText([])).toContain("(no memory files yet)");
  });
});

describe("file edits", () => {
  it("numbers lines and honours view_range", () => {
    const shown = viewFileText(diet.path, diet.content, [2, -1]);
    expect(shown).toEqual({
      ok: true,
      content: `Here's the content of ${diet.path} with line numbers:\n     2\t- 2026-10-12: Lunch protein 60 g or more.`,
    });
    expect(viewFileText(diet.path, diet.content, [3, 4]).ok).toBe(false);
  });

  it("replaces only a unique match", () => {
    expect(replaceOnce(diet.path, diet.content, "60 g", "70 g")).toEqual({
      ok: true,
      content: "# Diet: defaults\n- 2026-10-12: Lunch protein 70 g or more.",
    });
    expect(replaceOnce(diet.path, diet.content, "absent", "x").ok).toBe(false);
    expect(replaceOnce(diet.path, "a\na", "a", "b").ok).toBe(false);
    expect(replaceOnce(diet.path, diet.content, "", "x").ok).toBe(false);
  });

  it("inserts after a line and rejects lines out of range", () => {
    expect(insertAtLine("# T\n- a", 1, "- b")).toEqual({ ok: true, content: "# T\n- b\n- a" });
    expect(insertAtLine("# T", 0, "- top")).toEqual({ ok: true, content: "- top\n# T" });
    expect(insertAtLine("# T", 5, "- x").ok).toBe(false);
  });

  it("caps a file at the size limit", () => {
    expect(sizeError(diet.path, "x".repeat(MEMORY_FILE_MAX_CHARS))).toBeNull();
    expect(sizeError(diet.path, "x".repeat(MEMORY_FILE_MAX_CHARS + 1))).toContain("Split this topic");
  });

  it("lists a folder two levels deep with sizes", () => {
    const listing = folderListing("/memories", [diet, daNang]);
    expect(listing.split("\n").slice(1)).toEqual([`${daNang.content.length}\t${daNang.path}`, `${diet.content.length}\t${diet.path}`]);
  });

  it("strips dates and titles from what the coach learned", () => {
    expect(entryText("# Diet\n- 2026-11-11: Black coffee, no sugar.")).toBe("Black coffee, no sugar.");
    expect(entryText("# Diet")).toBeUndefined();
  });
});
