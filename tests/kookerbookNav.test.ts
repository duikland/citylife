import { describe, expect, it } from "vitest";
import { kookerbookProfileUrl, isKookerbookCitizenId } from "../src/colony/social/kookerbookNav";

describe("Kookerbook in-browser navigation", () => {
  it("builds a same-page profile URL with a screened citizen id", () => {
    const url = kookerbookProfileUrl(
      "https://citylife.example/kookerbook.html?citizen=citizen_joe&debug=1#old",
      "citizen_jack",
    );

    expect(url).toBe(
      "https://citylife.example/kookerbook.html?citizen=citizen_jack#old",
    );
  });

  it("refuses unsafe or non-citizen profile targets", () => {
    expect(isKookerbookCitizenId("citizen_jack")).toBe(true);
    expect(isKookerbookCitizenId("../admin")).toBe(false);
    expect(isKookerbookCitizenId("citizen_http://internal")).toBe(false);
    expect(isKookerbookCitizenId("profile_jack")).toBe(false);
  });
});
