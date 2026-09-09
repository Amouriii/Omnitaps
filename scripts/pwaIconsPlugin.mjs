/**
 * Vite plugin: generate every icon asset from the single shared artwork in
 * `src/brand/logoMark.ts` — the favicon SVGs themselves plus all PNG/ICO
 * rasters (tab fallbacks, apple-touch-icon, PWA manifest icons).
 *
 * The generated files are build artifacts: `public/*.svg|png|ico` are
 * gitignored. Generation is stamped by the source module's mtime so warm
 * dev starts skip the work; editing logoMark.ts (or deleting outputs)
 * regenerates.
 *
 * - Dev (`configureServer`): starts generation immediately and serves the
 *   generated files from the middleware itself once ready. Serving directly
 *   sidesteps any startup snapshot of the public dir in Vite's static
 *   middleware, so an early favicon request can never fall through to the
 *   SPA fallback.
 * - Build (`closeBundle`): regenerates into `public/` and also writes the
 *   set into `outDir` — whichever order Vite copies the public dir in, the
 *   emitted build ends up with fresh icons.
 *
 * The artwork module is TypeScript but the plugin must run without a TS
 * loader, so `parseLogoModule` extracts the exported constants with regexes
 * and validates them — a malformed module fails the dev server/build loudly.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const STAMP_FILE = ".icon-gen-stamp.json";
const LOGO_MODULE = "src/brand/logoMark.ts";

const FAVICON_OUTS = [
  { out: "favicon.svg", surface: "brand" },
  { out: "favicon-demo.svg", surface: "cafe" },
];

/* Raster jobs. `bg: null` keeps transparency; `imgScale` pads the mark so
   opaque/maskable variants keep clear margins (iOS rounding, Android masks). */
const RASTER_JOBS = [
  // Tab favicons: transparent, mark fills the frame like the SVG does.
  { src: "favicon.svg", out: "favicon-16.png", size: 16, bg: null, imgScale: 1 },
  { src: "favicon.svg", out: "favicon-32.png", size: 32, bg: null, imgScale: 1 },
  { src: "favicon-demo.svg", out: "favicon-demo-16.png", size: 16, bg: null, imgScale: 1 },
  { src: "favicon-demo.svg", out: "favicon-demo-32.png", size: 32, bg: null, imgScale: 1 },
  // Apple touch: opaque, mark at ~78% (iOS rounds corners itself).
  { src: "favicon.svg", out: "apple-touch-icon.png", size: 180, bg: "#faf9f7", imgScale: 0.78 },
  // Manifest "any": porcelain tile, mark at 72%.
  { src: "favicon.svg", out: "icon-192.png", size: 192, bg: "#faf9f7", imgScale: 0.72 },
  { src: "favicon.svg", out: "icon-512.png", size: 512, bg: "#faf9f7", imgScale: 0.72 },
  // Manifest "maskable": full-bleed bg, mark inside the 80% safe zone.
  { src: "favicon.svg", out: "icon-maskable-192.png", size: 192, bg: "#faf9f7", imgScale: 0.58 },
  { src: "favicon.svg", out: "icon-maskable-512.png", size: 512, bg: "#faf9f7", imgScale: 0.58 },
];

const ICO_JOBS = [
  { out: "favicon.ico", png16: "favicon-16.png", png32: "favicon-32.png" },
  { out: "favicon-demo.ico", png16: "favicon-demo-16.png", png32: "favicon-demo-32.png" },
];

const GENERATED_NAMES = new Set([
  ...FAVICON_OUTS.map((j) => j.out),
  ...RASTER_JOBS.map((j) => j.out),
  ...ICO_JOBS.map((j) => j.out),
]);

/* Favicon files: heavy stroke for 16 px legibility + padded viewBox so the
   round arc caps don't clip (padding > stroke/2). */
const FAVICON_STROKE = 5.5;
const FAVICON_PADDING = 1.5;

/* --- Shared-artwork extraction ------------------------------------------ */

function extractStringConst(source, name) {
  const match = source.match(new RegExp(`export const ${name} =\\s*"([^"]+)"`));
  if (!match) throw new Error(`[pwa-icons] ${LOGO_MODULE}: missing export const ${name}`);
  return match[1];
}

function extractNumberConst(source, name) {
  const match = source.match(new RegExp(`export const ${name} =\\s*([\\d.]+)`));
  if (!match) throw new Error(`[pwa-icons] ${LOGO_MODULE}: missing export const ${name}`);
  return Number(match[1]);
}

/** Parse `LOGO_PALETTE = { brand: { primary, accent }, cafe: { … } }`. */
function extractPalette(source) {
  const block = source.match(/export const LOGO_PALETTE = \{([\s\S]*?)\};/);
  if (!block) throw new Error(`[pwa-icons] ${LOGO_MODULE}: missing LOGO_PALETTE`);
  const palette = {};
  for (const surfaceMatch of block[1].matchAll(/(\w+):\s*\{[^}]*?primary:\s*"(#[0-9a-fA-F]{3,8})"[^}]*?accent:\s*"(#[0-9a-fA-F]{3,8})"/g)) {
    palette[surfaceMatch[1]] = { primary: surfaceMatch[2], accent: surfaceMatch[3] };
  }
  if (!palette.brand || !palette.cafe) {
    throw new Error(`[pwa-icons] ${LOGO_MODULE}: LOGO_PALETTE must define brand + cafe`);
  }
  return palette;
}

export function parseLogoModule(source) {
  return {
    size: extractNumberConst(source, "LOGO_VIEWBOX_SIZE"),
    dot: (() => {
      const dot = source.match(/export const LOGO_DOT = \{([^}]*)\}/);
      if (!dot) throw new Error(`[pwa-icons] ${LOGO_MODULE}: missing LOGO_DOT`);
      const get = (key) => {
        const m = dot[1].match(new RegExp(`${key}:\\s*([\\d.]+)`));
        if (!m) throw new Error(`[pwa-icons] ${LOGO_MODULE}: LOGO_DOT missing ${key}`);
        return Number(m[1]);
      };
      return { cx: get("cx"), cy: get("cy"), r: get("r") };
    })(),
    arcInner: extractStringConst(source, "LOGO_ARC_INNER"),
    arcOuter: extractStringConst(source, "LOGO_ARC_OUTER"),
    palette: extractPalette(source),
    accentOpacity: source.match(/ACCENT_OPACITY = ([\d.]+)/)?.[1] ?? "0.75",
  };
}

/* Mirror of buildLogoMarkSvg() in the artwork module, operating on the
   parsed constants (kept in sync; covered by scripts test against the TS). */
export function buildLogoMarkSvgFrom(art, { stroke = 3.2, padding = 0, surface = "brand" } = {}) {
  const { primary, accent } = art.palette[surface];
  const viewBox = [-padding, -padding, art.size + padding * 2, art.size + padding * 2].join(" ");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none">`,
    `<circle cx="${art.dot.cx}" cy="${art.dot.cy}" r="${art.dot.r}" fill="${primary}" />`,
    `<path d="${art.arcInner}" stroke="${primary}" stroke-width="${stroke}" stroke-linecap="round" />`,
    `<path d="${art.arcOuter}" stroke="${accent}" stroke-width="${stroke}" stroke-linecap="round" opacity="${art.accentOpacity}" />`,
    `</svg>`,
  ].join("");
}

/* --- Generation ---------------------------------------------------------- */

function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);

  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, data } of pngs) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(entry);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

async function rasterizeOne(svgBuffer, publicDir, job) {
  const img = Math.round(job.size * job.imgScale);
  const pad = job.size - img;
  const pipeline = sharp(svgBuffer, { density: 72 * (job.size / 40) })
    .resize(img, img)
    .extend({
      top: Math.floor(pad / 2),
      bottom: Math.ceil(pad / 2),
      left: Math.floor(pad / 2),
      right: Math.ceil(pad / 2),
      background: job.bg ?? { r: 0, g: 0, b: 0, alpha: 0 },
    });

  if (job.bg) {
    await pipeline.flatten({ background: job.bg }).png().toFile(path.join(publicDir, job.out));
  } else {
    await pipeline.png().toFile(path.join(publicDir, job.out));
  }
}

async function generateAll(art, publicDir) {
  const svgBuffers = new Map();
  for (const job of FAVICON_OUTS) {
    const svg = buildLogoMarkSvgFrom(art, {
      stroke: FAVICON_STROKE,
      padding: FAVICON_PADDING,
      surface: job.surface,
    });
    svgBuffers.set(job.out, Buffer.from(svg));
    fs.writeFileSync(path.join(publicDir, job.out), svg);
  }
  for (const job of RASTER_JOBS) {
    await rasterizeOne(svgBuffers.get(job.src), publicDir, job);
  }
  for (const job of ICO_JOBS) {
    const ico = buildIco([
      { size: 16, data: fs.readFileSync(path.join(publicDir, job.png16)) },
      { size: 32, data: fs.readFileSync(path.join(publicDir, job.png32)) },
    ]);
    fs.writeFileSync(path.join(publicDir, job.out), ico);
  }
}

export function pwaIconsPlugin() {
  let publicDir = "";
  let root = "";
  let outDir = "";
  let art = null;

  async function runIfStale() {
    const modulePath = path.join(root, LOGO_MODULE);
    const stampPath = path.join(root, STAMP_FILE);
    const fingerprint = fs.existsSync(modulePath) ? `module:${fs.statSync(modulePath).mtimeMs}` : "missing";

    let stamp = "";
    try {
      stamp = JSON.parse(fs.readFileSync(stampPath, "utf8")).fingerprint;
    } catch {
      /* first run or deleted stamp -> regenerate */
    }

    const names = [...GENERATED_NAMES];
    const allMissing = names.every((n) => !fs.existsSync(path.join(publicDir, n)));
    if (stamp === fingerprint && !allMissing) return;

    art = parseLogoModule(fs.readFileSync(modulePath, "utf8"));
    await generateAll(art, publicDir);
    fs.writeFileSync(stampPath, JSON.stringify({ fingerprint }));
    console.log(`[pwa-icons] generated ${names.length} assets from ${LOGO_MODULE}`);
  }

  function copyGeneratedToOutDir() {
    if (!outDir) return;
    fs.mkdirSync(outDir, { recursive: true });
    for (const name of GENERATED_NAMES) {
      const src = path.join(publicDir, name);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(outDir, name));
      }
    }
  }

  return {
    name: "omnitaps-pwa-icons",
    configResolved(config) {
      publicDir = config.publicDir;
      root = config.root;
      outDir = path.isAbsolute(config.build?.outDir ?? "")
        ? config.build.outDir
        : path.join(config.root, config.build?.outDir ?? "dist");
    },
    configureServer(server) {
      // Dev: generate now; serve the generated files from this middleware
      // once ready (registered before Vite's internal static + SPA fallback).
      const ready = runIfStale();
      server.middlewares.use((req, res, next) => {
        const match = /^\/([\w.-]+\.(?:svg|png|ico))(\?|$)/.exec(req.url ?? "");
        if (!match || !GENERATED_NAMES.has(match[1])) {
          next();
          return;
        }
        ready.then(
          () => {
            const file = path.join(publicDir, match[1]);
            if (!fs.existsSync(file)) {
              next();
              return;
            }
            const type = match[1].endsWith(".ico")
              ? "image/x-icon"
              : match[1].endsWith(".svg")
                ? "image/svg+xml"
                : "image/png";
            res.setHeader("Content-Type", type);
            res.setHeader("Cache-Control", "no-cache");
            fs.createReadStream(file).pipe(res);
          },
          (error) => {
            next(error ?? new Error("pwa-icons generation failed"));
          },
        );
      });
    },
    async closeBundle() {
      // Build: refresh public/, then make sure the emitted build has the set
      // regardless of whether Vite copies public/ before or after this hook.
      await runIfStale();
      copyGeneratedToOutDir();
    },
  };
}
