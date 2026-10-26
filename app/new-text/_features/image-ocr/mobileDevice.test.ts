import { describe, expect, it } from "vitest";
import { isMobileDevice } from "./mobileDevice";

function createNavigator(overrides: Partial<Navigator> = {}) {
  return {
    maxTouchPoints: 0,
    platform: "Win32",
    userAgent: "Desktop browser",
    ...overrides,
  } as Navigator;
}

describe("isMobileDevice", () => {
  it("uses the browser mobile hint when available", () => {
    const mobileNavigator = Object.assign(createNavigator(), {
      userAgentData: { mobile: true },
    });
    const desktopNavigator = Object.assign(createNavigator(), {
      userAgentData: { mobile: false },
    });

    expect(isMobileDevice(mobileNavigator)).toBe(true);
    expect(isMobileDevice(desktopNavigator)).toBe(false);
  });

  it("recognizes Android and iPhone user agents", () => {
    expect(isMobileDevice(createNavigator({ userAgent: "Mozilla/5.0 Android" })))
      .toBe(true);
    expect(isMobileDevice(createNavigator({ userAgent: "Mozilla/5.0 iPhone" })))
      .toBe(true);
  });

  it("recognizes iPadOS when it reports itself as a Mac", () => {
    expect(isMobileDevice(createNavigator({
      maxTouchPoints: 5,
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 Macintosh",
    }))).toBe(true);
  });
});

