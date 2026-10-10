type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    mobile?: boolean;
  };
};

export function isMobileDevice(navigatorValue: Navigator) {
  const { mobile } = (navigatorValue as NavigatorWithUserAgentData).userAgentData ?? {};
  if (typeof mobile === "boolean") return mobile;

  if (/Android|iPhone|iPad|iPod/i.test(navigatorValue.userAgent)) {
    return true;
  }

  return navigatorValue.platform === "MacIntel"
    && navigatorValue.maxTouchPoints > 1;
}

