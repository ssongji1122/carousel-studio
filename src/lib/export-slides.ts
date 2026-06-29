import puppeteer, { type Browser } from "puppeteer";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { wrapSlideHtml, extractFontFamilies } from "./slide-html";
import { getInlinedFontCSS } from "./fonts";
import type { Slide, AspectRatio } from "@/types/carousel";
import { DIMENSIONS } from "@/types/carousel";

// Singleton browser with lifecycle management
let browser: Browser | null = null;
let browserLaunch: Promise<Browser> | null = null;
let exportCount = 0;
const MAX_EXPORTS_BEFORE_RESTART = 50;
const EXPORT_CONCURRENCY = 1;
const REMOTE_IMAGE_TIMEOUT_MS = 8000;
const MAX_REMOTE_IMAGE_BYTES = 8 * 1024 * 1024;
const FONT_READY_TIMEOUT_MS = 2000;
const SCREENSHOT_TIMEOUT_MS = 15000;
const MAC_CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const imageDataCache = new Map<string, Promise<string>>();

async function getBrowser(): Promise<Browser> {
  if (browser && exportCount >= MAX_EXPORTS_BEFORE_RESTART) {
    await browser.close().catch(() => {});
    browser = null;
    exportCount = 0;
  }
  if (!browser || !browser.isConnected()) {
    browserLaunch ??= launchBrowser();
    try {
      browser = await browserLaunch;
    } finally {
      browserLaunch = null;
    }
    exportCount = 0;
  }
  return browser;
}

function launchBrowser(): Promise<Browser> {
  const executablePath = existsSync(MAC_CHROME_PATH) ? MAC_CHROME_PATH : undefined;
  return puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-extensions",
      "--hide-scrollbars",
      "--mute-audio",
    ],
  });
}

/**
 * Inline all image references in slide HTML.
 * Replaces /uploads/xxx.png paths with data: URIs.
 */
export async function inlineImages(html: string): Promise<string> {
  const uploadDir = path.resolve(process.cwd(), "public");
  const imgRegex = /(?:src=["']|url\(["']?)(\/uploads\/[^"'\s)]+|https?:\/\/[^"'\s)]+)/g;
  const refs = Array.from(new Set([...html.matchAll(imgRegex)].map((match) => match[1])));

  let result = html;
  for (const ref of refs) {
    const dataUri = ref.startsWith("/uploads/")
      ? await localImageDataUri(uploadDir, ref)
      : await remoteImageDataUri(ref);
    result = result.split(ref).join(dataUri);
  }

  return result;
}

async function localImageDataUri(uploadDir: string, imgPath: string): Promise<string> {
  const fullPath = path.join(uploadDir, imgPath);
  const buffer = await readFile(fullPath);
  return toDataUri(buffer, mimeFromPath(imgPath));
}

async function remoteImageDataUri(url: string): Promise<string> {
  const cached = imageDataCache.get(url);
  if (cached) return cached;
  const pending = fetchRemoteImageDataUri(url);
  imageDataCache.set(url, pending);
  try {
    return await pending;
  } catch (error) {
    imageDataCache.delete(url);
    throw error;
  }
}

async function fetchRemoteImageDataUri(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_IMAGE_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Image fetch failed ${response.status}: ${url}`);
    }
    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > MAX_REMOTE_IMAGE_BYTES) {
      throw new Error(`Image is too large to export: ${url}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_REMOTE_IMAGE_BYTES) {
      throw new Error(`Image is too large to export: ${url}`);
    }
    const mime = response.headers.get("content-type")?.split(";")[0] || mimeFromPath(url);
    return toDataUri(buffer, mime);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Image fetch timed out: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function toDataUri(buffer: Buffer, mime: string): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function mimeFromPath(value: string): string {
  const pathname = (() => {
    try {
      return new URL(value).pathname;
    } catch {
      return value;
    }
  })();
  const ext = path.extname(pathname).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  return "image/webp";
}

/**
 * Export a single slide to PNG buffer.
 */
export async function exportSlide(
  slide: Slide,
  aspectRatio: AspectRatio,
  activeBrowser?: Browser
): Promise<Buffer> {
  const { width, height } = DIMENSIONS[aspectRatio];

  // Get inlined font CSS
  const fontFamilies = extractFontFamilies(slide.html);
  const inlinedFontCss = await getInlinedFontCSS(fontFamilies);

  // Inline images
  const inlinedHtml = await inlineImages(slide.html);

  // Build self-contained HTML
  const fullHtml = wrapSlideHtml(inlinedHtml, aspectRatio, {
    inlineFontCss: inlinedFontCss,
  });

  const br = activeBrowser ?? await getBrowser();
  const page = await br.newPage();

  try {
    page.setDefaultTimeout(SCREENSHOT_TIMEOUT_MS);
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(fullHtml, { waitUntil: "domcontentloaded", timeout: 15000 });

    // Wait for fonts to be ready
    await page
      .waitForFunction(
        () =>
          document.fonts.ready.then(() =>
            [...document.fonts].every((f) => f.status === "loaded")
          ),
        { timeout: FONT_READY_TIMEOUT_MS }
      )
      .catch(() => {
        // Font loading timeout — proceed with whatever loaded
      });

    const screenshotBuffer = await withTimeout(
      page.screenshot({
        type: "png",
        clip: { x: 0, y: 0, width, height },
      }),
      SCREENSHOT_TIMEOUT_MS,
      "Slide screenshot timed out"
    );

    exportCount++;

    // Post-process with Sharp: enforce sRGB
    const processed = await sharp(screenshotBuffer)
      .toColorspace("srgb")
      .png()
      .toBuffer();

    return processed;
  } catch (error) {
    if (!activeBrowser) {
      await closeBrowser(br);
      browser = null;
      exportCount = 0;
    }
    throw error;
  } finally {
    await closePage(page);
  }
}

/**
 * Export all slides of a carousel to PNG buffers.
 * Processes up to 3 slides concurrently.
 */
export async function exportAllSlides(
  slides: Slide[],
  aspectRatio: AspectRatio,
  onProgress?: (current: number, total: number) => void
): Promise<{ name: string; buffer: Buffer }[]> {
  const results: { name: string; buffer: Buffer }[] = [];
  const br = await launchBrowser();

  try {
    for (let i = 0; i < slides.length; i += EXPORT_CONCURRENCY) {
      const batch = slides.slice(i, i + EXPORT_CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(async (slide, batchIdx) => {
          const idx = i + batchIdx;
          const buffer = await exportSlide(slide, aspectRatio, br);
          onProgress?.(idx + 1, slides.length);
          return { name: `slide-${idx + 1}.png`, buffer };
        })
      );
      results.push(...batchResults);
    }
  } finally {
    await closeBrowser(br);
  }

  return results;
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function closePage(page: Awaited<ReturnType<Browser["newPage"]>>): Promise<void> {
  await withTimeout(page.close(), 3000, "Page close timed out").catch(() => {});
}

async function closeBrowser(br: Browser): Promise<void> {
  await withTimeout(br.close(), 3000, "Browser close timed out").catch(() => {});
}
