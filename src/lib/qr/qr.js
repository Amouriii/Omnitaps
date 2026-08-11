const DEFAULT_QR_COLORS = {
  bgColor: "#ffffff",
  fgColor: "#12151a",
  frameBackgroundColor: "#ffffff",
  frameBorderColor: "#e7e4dd",
  frameTextColor: "#12151a",
  frameCaptionColor: "#5c6470",
};

export function normalizeQrColors(colorProps = {}) {
  return {
    bgColor: colorProps.bgColor ?? DEFAULT_QR_COLORS.bgColor,
    fgColor: colorProps.fgColor ?? DEFAULT_QR_COLORS.fgColor,
    frameBackgroundColor:
      colorProps.frameBackgroundColor ?? DEFAULT_QR_COLORS.frameBackgroundColor,
    frameBorderColor: colorProps.frameBorderColor ?? DEFAULT_QR_COLORS.frameBorderColor,
    frameTextColor: colorProps.frameTextColor ?? DEFAULT_QR_COLORS.frameTextColor,
    frameCaptionColor: colorProps.frameCaptionColor ?? DEFAULT_QR_COLORS.frameCaptionColor,
  };
}

export function buildQrImageSettings({
  logoSrc,
  logoSize,
  logoPadding = 0,
  logoOpacity = 1,
  logoCrossOrigin,
  logoExcavate = true,
  size,
}) {
  if (!logoSrc) {
    return undefined;
  }

  const maxLogoSize = Math.max(0, size - logoPadding * 2);
  const resolvedSize = Math.max(0, Math.min(logoSize ?? size * 0.24, maxLogoSize));

  return {
    src: logoSrc,
    width: resolvedSize,
    height: resolvedSize,
    opacity: logoOpacity,
    excavate: logoExcavate,
    crossOrigin: logoCrossOrigin,
  };
}

export function buildQrA11yTitle({ value, title, frameLabel, frameCaption }) {
  if (title) {
    return title;
  }

  const label = [frameLabel, frameCaption].filter(Boolean).join(" ").trim();
  return label || value;
}