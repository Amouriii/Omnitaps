import { QRCodeSVG } from "qrcode.react";
import { buildQrA11yTitle, buildQrImageSettings, normalizeQrColors } from "./qr";

export function QrCodeSvg({
  value,
  size = 256,
  level = "H",
  marginSize = 2,
  bgColor,
  fgColor,
  frameBackgroundColor,
  frameBorderColor,
  frameTextColor,
  frameCaptionColor,
  logoSrc,
  logoAlt,
  logoSize,
  logoPadding = 12,
  logoOpacity = 1,
  logoCrossOrigin,
  logoExcavate = true,
  title,
  frameLabel,
  frameCaption,
  framePosition = "bottom",
  className = "",
  frameClassName = "",
  labelClassName = "",
  qrClassName = "",
  ...svgProps
}) {
  const colors = normalizeQrColors({
    bgColor,
    fgColor,
    frameBackgroundColor,
    frameBorderColor,
    frameTextColor,
    frameCaptionColor,
  });
  const imageSettings = buildQrImageSettings({
    logoSrc,
    logoSize,
    logoPadding,
    logoOpacity,
    logoCrossOrigin,
    logoExcavate,
    size,
  });
  const qrTitle = buildQrA11yTitle({
    value,
    title,
    frameLabel,
    frameCaption,
  });
  const showFrame = Boolean(frameLabel || frameCaption);
  const frameContent = showFrame ? (
    <div
      className={frameClassName}
      style={{
        backgroundColor: colors.frameBackgroundColor,
        border: `1px solid ${colors.frameBorderColor}`,
        borderRadius: 18,
        padding: "0.875rem 1rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.25rem",
        textAlign: "center",
      }}
    >
      {frameLabel ? (
        <div className={labelClassName} style={{ color: colors.frameTextColor, fontWeight: 600 }}>
          {frameLabel}
        </div>
      ) : null}
      {frameCaption ? (
        <div style={{ color: colors.frameCaptionColor, fontSize: "0.875rem" }}>{frameCaption}</div>
      ) : null}
    </div>
  ) : null;
  const qrShellStyle = {
    backgroundColor: colors.frameBackgroundColor,
    border: `1px solid ${colors.frameBorderColor}`,
    borderRadius: 24,
    padding: 12,
    lineHeight: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <figure className={className} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      {showFrame && framePosition === "top" ? frameContent : null}
      <div style={qrShellStyle}>
        <QRCodeSVG
          value={value}
          size={size}
          level={level}
          marginSize={marginSize}
          bgColor={colors.bgColor}
          fgColor={colors.fgColor}
          title={qrTitle}
          imageSettings={imageSettings}
          className={qrClassName}
          {...svgProps}
        />
      </div>
      {logoAlt ? <span className="sr-only">{logoAlt}</span> : null}
      {showFrame && framePosition !== "top" ? frameContent : null}
    </figure>
  );
}