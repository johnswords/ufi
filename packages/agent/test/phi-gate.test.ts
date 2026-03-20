import { describe, expect, it } from "vitest";

import { createStructuredCriteriaFixture } from "@ufi/shared";

import { validateForCloudSync } from "../src/index.js";

describe("validateForCloudSync", () => {
  it("reuses the shared allowlist validator", () => {
    const result = validateForCloudSync(createStructuredCriteriaFixture());

    expect(result.passed).toBe(true);
  });
});
