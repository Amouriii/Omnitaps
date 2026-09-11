import { expect, test } from "@playwright/test";

/**
 * Motion smoke tests for the scroll-reveal system (src/hooks/useScrollReveal.js
 * + src/styles/siteMotion.css).
 *
 * Contract:
 * 1. Elements carrying .reveal / .reveal-child / .chrome-reveal start hidden
 *    (opacity 0) and gain .is-visible + full opacity once they enter the
 *    viewport. Chrome animates together with content: the header drops in on
 *    load, the footer rises when scrolled into view.
 * 2. Route changes play an arrival fade (.route-fade) on the remounted page;
 *    café-themed paths skip it (they have their own transition).
 * 3. With prefers-reduced-motion: reduce, everything is visible immediately —
 *    the hook skips observing and the CSS kill-switch neutralizes transitions.
 *
 * The dev server (npm run dev on :5173) is reused via playwright.config.ts.
 */

async function revealStats(page) {
    return page.evaluate(() => {
        const nodes = [...document.querySelectorAll(".reveal, .reveal-child, .chrome-reveal")];
        return {
            total: nodes.length,
            visible: nodes.filter((el) => el.classList.contains("is-visible")).length,
            // The real contract is rendered opacity, not the class: with
            // prefers-reduced-motion the hook never adds .is-visible and the
            // CSS kill-switch makes everything visible instead.
            hiddenOpacities: nodes.filter((el) => Number(getComputedStyle(el).opacity) < 0.99).length,
        };
    });
}

test.describe("scroll reveals (motion enabled)", () => {
    test.use({ reducedMotion: null });

    test("above-fold reveals fire on load; below-fold fire on scroll", async ({ page }) => {
        await page.goto("/about", { waitUntil: "networkidle" });

        // Above-fold hero content reveals immediately…
        const hero = page.locator("main h1");
        await expect(hero).toBeVisible();
        await expect(hero).toHaveCSS("opacity", "1");

        // …while below-fold content stays hidden until scrolled into view.
        const ctaPanel = page.locator("main section:last-of-type .reveal");
        await expect(ctaPanel).toHaveCSS("opacity", "0");

        await ctaPanel.scrollIntoViewIfNeeded();
        await expect(ctaPanel).toHaveCSS("opacity", "1", { timeout: 7_000 });
        await expect(ctaPanel).toHaveClass(/is-visible/);

        const stats = await revealStats(page);
        expect(stats.visible).toBeGreaterThan(0);
    });

    test("Home bento cards stagger in on scroll", async ({ page }) => {
        await page.goto("/", { waitUntil: "networkidle" });

        const firstCard = page.locator(".bento-card").first();
        await firstCard.scrollIntoViewIfNeeded();
        await expect(firstCard).toHaveClass(/is-visible/, { timeout: 7_000 });
        await expect(firstCard).toHaveCSS("opacity", "1");
    });

    test("Contact form section reveals on scroll", async ({ page }) => {
        await page.goto("/contact", { waitUntil: "networkidle" });

        const form = page.locator("form[aria-label='Contact form']");
        await expect(form).toHaveCSS("opacity", "0");

        await form.scrollIntoViewIfNeeded();
        await expect(form).toHaveCSS("opacity", "1", { timeout: 7_000 });
    });

    test("chrome animates together: header drops on load, footer rises on scroll", async ({ page }) => {
        await page.goto("/about", { waitUntil: "networkidle" });

        // Header leads the page in and settles fully visible…
        const header = page.locator("header.site-chrome--top");
        await expect(header).toBeVisible();
        await expect(header).toHaveCSS("opacity", "1");

        // …while the footer waits below the fold, then rises into view.
        const footer = page.locator("footer.chrome-reveal");
        await expect(footer).toHaveCSS("opacity", "0");
        await footer.scrollIntoViewIfNeeded();
        await expect(footer).toHaveCSS("opacity", "1", { timeout: 7_000 });
        await expect(footer).toHaveClass(/is-visible/);
    });
});

test.describe("route transitions", () => {
    test.use({ reducedMotion: null });

    test("arrival fade plays on client-side navigation", async ({ page }) => {
        await page.goto("/about", { waitUntil: "networkidle" });

        // First load also mounts the wrapper with the fade; it settles visible.
        await expect(page.locator(".route-fade")).toHaveCSS("opacity", "1");

        // Client-side navigation remounts the wrapper and replays the fade.
        await page.locator("header a", { hasText: "Book a Demo" }).click();
        await expect(page).toHaveURL(/\/contact$/);

        const wrapper = page.locator(".route-fade");
        await expect(wrapper).toHaveCSS("animation-name", "route-fade-in");
        await expect(wrapper).toHaveCSS("opacity", "1");
        await expect(page.locator("main h1")).toBeVisible();
    });

    test("café-themed routes skip the global fade (they have their own)", async ({ page }) => {
        await page.goto("/demo", { waitUntil: "networkidle" });

        await expect(page.locator(".route-fade")).toHaveCount(0);
        // The café transition is present instead.
        await expect(page.locator(".demo-cafe-route")).toHaveCount(1);
    });
});

test.describe("homepage connected-commerce hero", () => {
    test("keeps the live QR menu at the center of the payment story", async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem("omnitaps-theme", "light"));
        await page.goto("/", { waitUntil: "domcontentloaded" });

        await expect(page.locator(".hero-visual-shell")).toBeVisible();
        await expect(page.locator(".hero-visual-hud")).toContainText("Connected commerce");
        await expect(page.locator(".hero-payment-rail")).toContainText("Payment methods");
        await expect(page.locator(".hero-payment-rail__methods span")).toHaveCount(3);
        await expect(page.locator(".qr-card")).toBeVisible();
    });
});

test.describe("homepage intro theme integration", () => {
    test("uses the light product tokens while the intro is visible", async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem("omnitaps-theme", "light"));
        await page.goto("/", { waitUntil: "domcontentloaded" });

        const intro = page.locator(".omnitaps-intro");
        await expect(intro).toBeVisible();
        const colors = await intro.evaluate((element) => ({
            theme: document.documentElement.getAttribute("data-theme"),
            background: getComputedStyle(element).backgroundColor,
            heading: getComputedStyle(element.querySelector("h1")).color,
            link: getComputedStyle(element.querySelector("line")).stroke,
        }));

        expect(colors).toEqual({
            theme: "light",
            background: "rgb(250, 249, 247)",
            heading: "rgb(18, 21, 26)",
            link: "rgb(21, 94, 239)",
        });
    });

    test("uses the dark product tokens before the intro paints", async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem("omnitaps-theme", "dark"));
        await page.goto("/", { waitUntil: "domcontentloaded" });

        const intro = page.locator(".omnitaps-intro");
        await expect(intro).toBeVisible();
        const colors = await intro.evaluate((element) => ({
            theme: document.documentElement.getAttribute("data-theme"),
            background: getComputedStyle(element).backgroundColor,
            heading: getComputedStyle(element.querySelector("h1")).color,
            link: getComputedStyle(element.querySelector("line")).stroke,
        }));

        expect(colors).toEqual({
            theme: "dark",
            background: "rgb(15, 17, 21)",
            heading: "rgb(241, 243, 246)",
            link: "rgb(59, 130, 246)",
        });
    });
});

test.describe("prefers-reduced-motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("everything renders visible immediately, below the fold too", async ({ page }) => {
        await page.goto("/about", { waitUntil: "networkidle" });

        // Below-fold CTA is fully visible without any scrolling…
        const ctaPanel = page.locator("main section:last-of-type .reveal");
        await expect(ctaPanel).toHaveCSS("opacity", "1");
        await expect(ctaPanel).toHaveClass(/is-visible|reveal/); // class is irrelevant; opacity is the contract

        // …and no reveal element anywhere sits at opacity 0 (this probe also
        // covers footer.chrome-reveal, which must never be hidden in reduced
        // motion even though the hook skips observing).
        const stats = await revealStats(page);
        expect(stats.total).toBeGreaterThan(0);
        expect(stats.hiddenOpacities).toBe(0);

        // Chrome entrances are neutralized too: header visible on load, footer
        // visible without any scrolling.
        await expect(page.locator("header.site-chrome--top")).toHaveCSS("opacity", "1");
        await expect(page.locator("footer.chrome-reveal")).toHaveCSS("opacity", "1");

        // Continuous animations are switched off by the global kill-switch.
        const aurora = page.locator(".aurora").first();
        if (await aurora.count()) {
            await expect(aurora).toHaveCSS("animation-duration", "0.01ms");
        }
    });

    test("Home hero is fully visible without scroll", async ({ page }) => {
        await page.goto("/", { waitUntil: "networkidle" });

        const h1 = page.locator("main h1");
        await expect(h1).toHaveCSS("opacity", "1");

        const stats = await revealStats(page);
        expect(stats.hiddenOpacities).toBe(0);
    });

    test("route fade is neutralized", async ({ page }) => {
        await page.goto("/about", { waitUntil: "networkidle" });

        const wrapper = page.locator(".route-fade");
        await expect(wrapper).toHaveCSS("animation-name", "none");
        await expect(wrapper).toHaveCSS("opacity", "1");
    });
});
