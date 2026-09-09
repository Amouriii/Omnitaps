import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { deflateSync } from "node:zlib";

const PASS_CONTENT_TYPE = "application/vnd.apple.pkpass";

function escapeJson(value) {
  return JSON.stringify(value);
}

function hexColor(value, fallback) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || "")) ? value : fallback;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  // PNG CRC32 is small enough to implement without a dependency.
  let crcValue = 0xffffffff;
  for (const byte of Buffer.concat([typeBuffer, data])) {
    crcValue ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crcValue = (crcValue >>> 1) ^ (0xedb88320 & -(crcValue & 1));
    }
  }
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE((crcValue ^ 0xffffffff) >>> 0, 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function solidPng(color, size = 29) {
  const match = /^#([0-9a-fA-F]{6})$/.exec(color);
  const rgb = match ? Buffer.from(match[1], "hex") : Buffer.from("155eef", "hex");
  const width = size;
  const height = size;
  const row = Buffer.alloc(1 + width * 4);
  row[0] = 0;
  for (let index = 0; index < width; index += 1) {
    row.writeUInt8(rgb[0], 1 + index * 4);
    row.writeUInt8(rgb[1], 2 + index * 4);
    row.writeUInt8(rgb[2], 3 + index * 4);
    row.writeUInt8(255, 4 + index * 4);
  }
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function crc32(input) {
  let crc = 0xffffffff;
  for (const byte of input) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const stamp = dosDateTime();

  for (const [name, content] of Object.entries(files)) {
    const filename = Buffer.from(name);
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(stamp.time, 10);
    local.writeUInt16LE(stamp.date, 12);
    local.writeUInt32LE(crc32(data), 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(filename.length, 26);
    local.writeUInt16LE(0, 28);
    const localPart = Buffer.concat([local, filename, data]);
    localParts.push(localPart);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(stamp.time, 12);
    central.writeUInt16LE(stamp.date, 14);
    central.writeUInt32LE(crc32(data), 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(filename.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(Buffer.concat([central, filename]));
    offset += localPart.length;
  }

  const localBuffer = Buffer.concat(localParts);
  const centralBuffer = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(centralParts.length, 8);
  end.writeUInt16LE(centralParts.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(localBuffer.length, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([localBuffer, centralBuffer, end]);
}

function normalizeBarcodeFormat(value) {
  const format = String(value || "QR").toUpperCase();
  return {
    QR: "QR",
    PDF417: "PDF417",
    CODE128: "Code128",
    AZTEC: "Aztec",
  }[format] || "QR";
}

function buildPassJson({ program, member, serialNumber, authToken }) {
  const background = hexColor(program.background_color, "#12151a");
  const label = hexColor(program.label_color, "#ffffff");
  const displayName = [member.first_name, member.last_name].filter(Boolean).join(" ");
  const passType = String(program.program_type || "membership");
  return {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_WALLET_PASS_TYPE_ID || "pass.com.omnitaps.membership",
    serialNumber,
    teamIdentifier: process.env.APPLE_WALLET_TEAM_ID || "OMNITAPS",
    organizationName: String(program.name),
    description: `${program.name} membership card`,
    logoText: String(program.logo_text || "Omnitaps"),
    foregroundColor: label,
    backgroundColor: background,
    labelColor: label,
    webServiceURL: process.env.APPLE_WALLET_WEB_SERVICE_URL || undefined,
    authenticationToken: authToken,
    generic: {
      primaryFields: [{ key: "member", label: "MEMBER", value: displayName }],
      secondaryFields: [
        { key: "number", label: "MEMBER NUMBER", value: String(member.member_number) },
        ...(member.tier ? [{ key: "tier", label: "TIER", value: String(member.tier) }] : []),
      ],
      auxiliaryFields: [
        ...(member.expires_at
          ? [{ key: "expires", label: "VALID THROUGH", value: String(member.expires_at) }]
          : []),
        { key: "program", label: passType.replaceAll("_", " ").toUpperCase(), value: String(program.name) },
      ],
      backFields: [
        { key: "member", label: "MEMBER", value: displayName },
        { key: "number", label: "MEMBER NUMBER", value: String(member.member_number) },
        { key: "terms", label: "TERMS", value: "Present this card at the venue. Membership status is checked at scan time." },
        ...(program.support_url ? [{ key: "support", label: "SUPPORT", value: String(program.support_url) }] : []),
      ],
    },
    barcode: {
      format: `PKBarcodeFormat${normalizeBarcodeFormat(program.barcode_format)}`,
      message: `omnitaps://membership/${encodeURIComponent(String(member.member_number))}?token=${encodeURIComponent(authToken)}`,
      messageEncoding: "iso-8859-1",
      altText: String(member.member_number),
    },
  };
}

function getCertificateConfig() {
  const signer = process.env.APPLE_WALLET_SIGNER_P12_BASE64 || process.env.APPLE_WALLET_CERTIFICATE_BASE64;
  const password = process.env.APPLE_WALLET_CERTIFICATE_PASSWORD;
  const wwdr = process.env.APPLE_WALLET_WWDR_PEM;
  if (!signer || !password || !wwdr) return null;
  return { signer, password, wwdr };
}

function signManifest(manifest) {
  const config = getCertificateConfig();
  if (!config) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Apple Wallet signing credentials are not configured.");
    }
    return Buffer.from("DEVELOPMENT_UNSIGNED_PASS");
  }

  // OpenSSL handles the PKCS#12 private key/certificate bundle and WWDR chain.
  // Private material only exists in short-lived files inside the function's
  // ephemeral filesystem and is never returned in JSON or written to logs.
  const directory = mkdtempSync(join(tmpdir(), "omnitaps-wallet-"));
  const p12Path = join(directory, "signer.p12");
  const wwdrPath = join(directory, "wwdr.pem");
  const signerCertificatePath = join(directory, "signer-cert.pem");
  const signerKeyPath = join(directory, "signer-key.pem");
  const manifestPath = join(directory, "manifest.json");
  const signaturePath = join(directory, "signature");
  try {
    writeFileSync(p12Path, Buffer.from(config.signer, "base64"), { mode: 0o600 });
    writeFileSync(
      wwdrPath,
      config.wwdr.includes("BEGIN CERTIFICATE")
        ? config.wwdr
        : Buffer.from(config.wwdr, "base64"),
      { mode: 0o600 },
    );
    writeFileSync(manifestPath, JSON.stringify(manifest), { mode: 0o600 });

    const extractCertificate = spawnSync(
      "openssl",
      [
        "pkcs12", "-clcerts", "-nokeys", "-in", p12Path,
        "-passin", `pass:${config.password}`, "-out", signerCertificatePath,
      ],
      { encoding: "utf8" },
    );
    const extractKey = spawnSync(
      "openssl",
      [
        "pkcs12", "-nocerts", "-nodes", "-in", p12Path,
        "-passin", `pass:${config.password}`, "-out", signerKeyPath,
      ],
      { encoding: "utf8" },
    );
    if (extractCertificate.status !== 0 || extractKey.status !== 0) {
      throw new Error("Unable to read Apple Wallet certificate bundle.");
    }

    const signed = spawnSync(
      "openssl",
      [
        "smime", "-binary", "-sign", "-signer", signerCertificatePath,
        "-inkey", signerKeyPath, "-certfile", wwdrPath, "-in", manifestPath,
        "-out", signaturePath, "-outform", "DER",
      ],
      { encoding: "utf8" },
    );
    if (signed.status !== 0) {
      throw new Error("Unable to sign Apple Wallet manifest.");
    }
    return readFileSync(signaturePath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

export function createAppleWalletPass({ program, member, authToken }) {
  const serialNumber = `${program.id}-${member.id}`;
  const passJson = buildPassJson({ program, member, serialNumber, authToken });
  const passJsonBuffer = Buffer.from(escapeJson(passJson));
  const icon = solidPng(hexColor(program.primary_color, "#155eef"), 29);
  const icon2x = solidPng(hexColor(program.primary_color, "#155eef"), 58);
  const files = {
    "pass.json": passJsonBuffer,
    "icon.png": icon,
    "icon@2x.png": icon2x,
  };
  const manifest = Object.fromEntries(
    Object.entries(files).map(([name, content]) => [name, createHash("sha1").update(content).digest("hex")]),
  );
  files["manifest.json"] = Buffer.from(JSON.stringify(manifest));
  files.signature = signManifest(manifest);
  return {
    buffer: zipStore(files),
    contentType: PASS_CONTENT_TYPE,
    filename: `${String(program.name).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "membership"}.pkpass`,
  };
}

export { PASS_CONTENT_TYPE };
