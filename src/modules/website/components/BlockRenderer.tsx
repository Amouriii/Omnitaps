import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { ArrowDown, ArrowDownRight, ArrowUpRight, Clock, ExternalLink, MapPin, UtensilsCrossed } from "lucide-react";
import CafeReveal from "../../../components/demo/CafeReveal";

type CtaConfig = {
    label: string;
    href: string;
};

type TodayInfo = {
    status?: string;
    hours?: string;
    location?: string;
};

type HeroBlock = {
    type: "hero";
    eyebrow?: string;
    title: string;
    description?: string;
    primaryCta?: CtaConfig;
    secondaryCta?: CtaConfig;
    imageUrl?: string;
    imageAlt?: string;
    badge?: string;
    today?: TodayInfo;
};

type GalleryImage = {
    src: string;
    alt?: string;
    caption?: string;
};

type GalleryBlock = {
    type: "gallery";
    title?: string;
    description?: string;
    images: GalleryImage[];
    columns?: 2 | 3 | 4;
};

type MenuItem = {
    name: string;
    description?: string;
    price?: string;
    badge?: string;
};

type MenuCategory = {
    title: string;
    description?: string;
    items: MenuItem[];
};

type MenuBlock = {
    type: "menu";
    title?: string;
    description?: string;
    categories: MenuCategory[];
};

type MapBlock = {
    type: "map";
    title?: string;
    description?: string;
    address?: string;
    embedUrl?: string;
    directionsUrl?: string;
};

type HoursDay = {
    label: string;
    hours: string;
};

type HoursBlock = {
    type: "hours";
    eyebrow?: string;
    title?: string;
    description?: string;
    days?: HoursDay[];
};

type CtaBlock = {
    type: "cta";
    eyebrow?: string;
    title?: string;
    description?: string;
    primaryCta?: CtaConfig;
    secondaryCta?: CtaConfig;
};

type UnknownBlock = {
    type: string;
    [key: string]: unknown;
};

export type BlockConfig = HeroBlock | GalleryBlock | MenuBlock | MapBlock | HoursBlock | CtaBlock | UnknownBlock;

export interface BlockRendererProps {
    blocks: BlockConfig[] | string;
    className?: string;
    renderUnknownBlock?: (block: UnknownBlock, index: number) => ReactNode;
}

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function parseBlocks(blocks: BlockRendererProps["blocks"]): BlockConfig[] {
    if (typeof blocks === "string") {
        try {
            const parsed = JSON.parse(blocks) as unknown;
            return Array.isArray(parsed) ? (parsed as BlockConfig[]) : [];
        } catch {
            return [];
        }
    }

    return Array.isArray(blocks) ? blocks : [];
}

function SectionShell({
    eyebrow,
    title,
    description,
    children,
    className,
    inverted = false,
}: {
    eyebrow?: string;
    title?: string;
    description?: string;
    children: ReactNode;
    className?: string;
    inverted?: boolean;
}) {
    return (
        <section
            className={cx(
                "rounded-3xl border p-6 shadow-[0_28px_60px_-42px_rgba(18,21,26,0.38)] md:p-8",
                inverted
                    ? "cafe-hero-panel overflow-hidden border-transparent"
                    : "border-hairline bg-surface",
                className,
            )}
        >
            {(eyebrow || title || description) && (
                <div className="mb-6 max-w-3xl">
                    {eyebrow ? <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-tap">{eyebrow}</p> : null}
                    {title ? <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">{title}</h2> : null}
                    {description ? <p className="mt-3 text-sm leading-6 text-ink-muted md:text-base">{description}</p> : null}
                </div>
            )}
            {children}
        </section>
    );
}

function HeroBlockView({ block }: { block: HeroBlock }) {
    const mediaRef = useRef<HTMLDivElement>(null);
    const enterStyle = (index: number) => ({ "--enter-delay": `${index * 120}ms` } as CSSProperties);
    const imageUrl = block.imageUrl;
    const responsiveImage = imageUrl?.includes("images.unsplash.com")
        ? [480, 768, 1200, 1800]
            .map((width) => `${imageUrl.replace(/([?&])w=\\d+/, `$1w=${width}`)} ${width}w`)
            .join(", ")
        : undefined;

    useEffect(() => {
        const media = mediaRef.current;
        if (!media || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

        const updateScrollPosition = () => {
            const bounds = media.getBoundingClientRect();
            const progress = Math.max(-1, Math.min(1, (window.innerHeight / 2 - (bounds.top + bounds.height / 2)) / window.innerHeight));
            media.style.setProperty("--hero-scroll-y", `${progress * 18}px`);
        };
        const onPointerMove = (event: PointerEvent) => {
            const bounds = media.getBoundingClientRect();
            const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 8;
            const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 8;
            media.style.setProperty("--hero-pointer-x", `${x}px`);
            media.style.setProperty("--hero-pointer-y", `${y}px`);
        };
        const resetPointer = () => {
            media.style.setProperty("--hero-pointer-x", "0px");
            media.style.setProperty("--hero-pointer-y", "0px");
        };

        updateScrollPosition();
        window.addEventListener("scroll", updateScrollPosition, { passive: true });
        media.addEventListener("pointermove", onPointerMove);
        media.addEventListener("pointerleave", resetPointer);
        return () => {
            window.removeEventListener("scroll", updateScrollPosition);
            media.removeEventListener("pointermove", onPointerMove);
            media.removeEventListener("pointerleave", resetPointer);
        };
    }, []);

    return (
        <SectionShell inverted className="cafe-hero-shell">
            <div className="cafe-hero-grid">
                <div className="cafe-hero-copy min-w-0">
                    <div className="cafe-hero-meta cafe-enter" style={enterStyle(0)}>
                        <span className="cafe-hero-meta__dot" aria-hidden="true" />
                        {block.eyebrow || "Harbor Lane"}
                    </div>
                    <h1 className="cafe-enter mt-5 max-w-4xl font-display text-5xl font-semibold leading-[0.95] tracking-[-0.045em] text-[#faf4ea] sm:text-6xl lg:text-8xl" style={enterStyle(1)}>
                        {block.title}
                    </h1>
                    {block.description ? (
                        <p className="cafe-enter mt-7 max-w-xl text-base leading-7 text-[#faf4ea]/75 sm:text-lg" style={enterStyle(2)}>
                            {block.description}
                        </p>
                    ) : null}

                    <div className="cafe-enter mt-8 flex flex-wrap items-center gap-4" style={enterStyle(3)}>
                        {block.primaryCta ? (
                            <a
                                href={block.primaryCta.href}
                                className="cafe-btn cafe-btn--light inline-flex items-center justify-center gap-3 rounded-full bg-[#faf4ea] px-5 py-3.5 text-sm font-semibold text-[#2c1b12] shadow-[0_18px_40px_-22px_rgba(250,244,234,0.65)]"
                            >
                                {block.primaryCta.label}
                                <ArrowDownRight aria-hidden="true" className="h-4 w-4" />
                            </a>
                        ) : null}
                        {block.secondaryCta ? (
                            <a
                                href={block.secondaryCta.href}
                                className="cafe-btn inline-flex items-center justify-center gap-2 rounded-full px-2 py-3 text-sm font-semibold text-[#faf4ea]"
                            >
                                {block.secondaryCta.label}
                                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                            </a>
                        ) : null}
                    </div>
                </div>

                <div ref={mediaRef} className="cafe-enter--scale cafe-hero-media relative min-w-0" style={enterStyle(2)}>
                    {block.badge ? (
                        <div className="cafe-enter--pop cafe-hero-badge" style={enterStyle(5)}>
                            <span className="cafe-hero-badge__dot" aria-hidden="true" />
                            {block.badge}
                        </div>
                    ) : null}
                    {block.imageUrl ? (
                        <img
                            src={block.imageUrl}
                            srcSet={responsiveImage}
                            sizes="(max-width: 767px) 100vw, (max-width: 1199px) 48vw, 42rem"
                            alt={block.imageAlt ?? block.title}
                            className="cafe-hero-image"
                            width="1800"
                            height="1400"
                            loading="eager"
                            fetchPriority="high"
                            decoding="async"
                        />
                    ) : (
                        <div className="cafe-hero-art cafe-hero-image relative overflow-hidden" aria-hidden="true">
                            <span className="cafe-hero-art__cup" />
                            <span className="cafe-hero-art__steam" />
                        </div>
                    )}
                    <div className="cafe-hero-media__caption">
                        <span>{block.today?.status || "Open daily"}</span>
                        <span aria-hidden="true">·</span>
                        <span>{block.today?.hours || "Walk-ins welcome"}</span>
                    </div>
                    {block.today ? (
                        <a className="cafe-hero-scroll-cue" href="#cafe-today" aria-label="Explore today's café details">
                            <span>Explore the café</span>
                            <ArrowDown aria-hidden="true" className="h-4 w-4" />
                        </a>
                    ) : null}
                </div>
            </div>
            {block.today ? <CafeTodayStrip today={block.today} /> : null}
        </SectionShell>
    );
}

function CafeTodayStrip({ today }: { today: TodayInfo }) {
    return (
        <div id="cafe-today" className="cafe-today-strip cafe-enter" style={{ "--enter-delay": "480ms" } as CSSProperties}>
            <div>
                <span className="cafe-today-strip__label">Today</span>
                <strong>{today.status || "Open today"}</strong>
            </div>
            <div>
                <span className="cafe-today-strip__label">Hours</span>
                <strong>{today.hours || "Walk-ins welcome"}</strong>
            </div>
            <div>
                <span className="cafe-today-strip__label">Find us</span>
                <strong>{today.location || "Harbor Lane"}</strong>
            </div>
        </div>
    );
}

function GalleryBlockView({ block }: { block: GalleryBlock }) {
    const columnsClassName =
        block.columns === 4 ? "sm:grid-cols-2 xl:grid-cols-4" : block.columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";

    return (
        <SectionShell eyebrow="Gallery" title={block.title} description={block.description}>
            <div className={cx("cafe-gallery-grid grid gap-4", columnsClassName)}>
                {block.images.map((image, index) => (
                    <CafeReveal key={`${image.src}-${index}`} delay={index * 90} variant="scale" as="figure" className={`cafe-gallery-figure overflow-hidden rounded-2xl border border-hairline bg-porcelain ${index === 0 ? "cafe-gallery-figure--feature" : ""}`.trim()}>
                        <img
                            src={image.src}
                            alt={image.alt ?? `Gallery image ${index + 1}`}
                            className="h-56 w-full object-cover"
                            loading={index === 0 ? "eager" : "lazy"}
                            decoding="async"
                        />
                        {image.caption ? <figcaption className="border-t border-hairline px-4 py-3 text-sm text-ink-muted">{image.caption}</figcaption> : null}
                    </CafeReveal>
                ))}
            </div>
        </SectionShell>
    );
}

function menuCategoryId(title: string, index: number) {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `menu-category-${slug || index}`;
}

function MenuBlockView({ block }: { block: MenuBlock }) {
    return (
        <SectionShell eyebrow="Menu" title={block.title} description={block.description}>
            <nav className="cafe-menu-tabs" aria-label="Menu categories">
                {block.categories.map((category, index) => (
                    <a key={`${category.title}-${index}`} href={`#${menuCategoryId(category.title, index)}`}>
                        {category.title}
                    </a>
                ))}
            </nav>
            <div className="grid gap-6 lg:grid-cols-2">
                {block.categories.map((category, categoryIndex) => (
                    <div id={menuCategoryId(category.title, categoryIndex)} key={`${category.title}-${categoryIndex}`} className="cafe-menu-category rounded-2xl border border-hairline p-5">
                        <div className="mb-4 flex items-center gap-2">
                            <UtensilsCrossed className="h-4 w-4 text-tap" />
                            <h3 className="text-lg font-semibold text-ink">{category.title}</h3>
                        </div>
                        {category.description ? <p className="mb-4 text-sm leading-6 text-ink-muted">{category.description}</p> : null}
                        <div className="space-y-4">
                            {category.items.map((item, itemIndex) => (
                                <article key={`${item.name}-${itemIndex}`} className="cafe-menu-row -mx-2 border-b border-hairline px-2 pb-4 last:border-b-0 last:pb-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="font-medium text-ink">{item.name}</h4>
                                                {item.badge ? (
                                                    <span className="rounded-full bg-brass-soft px-2 py-0.5 text-xs font-medium text-brass-dark">
                                                        {item.badge}
                                                    </span>
                                                ) : null}
                                            </div>
                                            {item.description ? <p className="mt-1 text-sm leading-6 text-ink-muted">{item.description}</p> : null}
                                        </div>
                                        {item.price ? <span className="shrink-0 text-sm font-semibold text-ink">{item.price}</span> : null}
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </SectionShell>
    );
}

function MapBlockView({ block }: { block: MapBlock }) {
    return (
        <SectionShell eyebrow="Map" title={block.title} description={block.description}>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-stretch">
                <div className="rounded-2xl border border-hairline bg-porcelain p-5">
                    <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-tap" />
                        <div>
                            <h3 className="font-semibold text-ink">Location</h3>
                            {block.address ? <p className="mt-2 text-sm leading-6 text-ink-muted">{block.address}</p> : null}
                        </div>
                    </div>

                    {block.directionsUrl ? (
                        <a
                            href={block.directionsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-porcelain transition hover:bg-ink-muted"
                        >
                            Open directions
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    ) : null}
                </div>

                <div className="overflow-hidden rounded-2xl border border-hairline bg-porcelain">
                    {block.embedUrl ? (
                        <iframe
                            title={block.title ?? "Map"}
                            src={block.embedUrl}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            className="h-80 w-full border-0"
                        />
                    ) : (
                        <div className="flex h-80 items-center justify-center px-6 text-center text-sm leading-6 text-ink-faint">
                            Provide an embedUrl to render an interactive map.
                        </div>
                    )}
                </div>
            </div>
        </SectionShell>
    );
}

function HoursBlockView({ block }: { block: HoursBlock }) {
    const days = Array.isArray(block.days) ? block.days : [];

    return (
        <SectionShell eyebrow={block.eyebrow || "Hours"} title={block.title} description={block.description}>
            <ul className="divide-y divide-hairline rounded-2xl border border-hairline">
                {days.map((day) => (
                    <li key={day.label} className="flex items-center justify-between gap-4 px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                            <Clock className="h-4 w-4 text-tap" />
                            {day.label}
                        </span>
                        <span className="text-sm text-ink-muted">{day.hours}</span>
                    </li>
                ))}
            </ul>
        </SectionShell>
    );
}

function CtaBlockView({ block }: { block: CtaBlock }) {
    return (
        <SectionShell eyebrow={block.eyebrow} title={block.title} description={block.description} className="cafe-final-cta bg-tap-soft">
            <div className="flex flex-wrap gap-3">
                {block.primaryCta ? (
                    <a
                        href={block.primaryCta.href}
                        className="cafe-btn inline-flex items-center justify-center gap-3 rounded-full bg-ink px-5 py-3.5 text-sm font-semibold text-porcelain transition hover:bg-ink-muted"
                    >
                        {block.primaryCta.label}
                        <ArrowDownRight aria-hidden="true" className="h-4 w-4" />
                    </a>
                ) : null}
                {block.secondaryCta ? (
                    <a
                        href={block.secondaryCta.href}
                        className="cafe-btn inline-flex items-center justify-center gap-3 rounded-full border border-hairline bg-surface px-5 py-3.5 text-sm font-semibold text-ink transition hover:border-hairline-strong"
                    >
                        {block.secondaryCta.label}
                        <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                    </a>
                ) : null}
            </div>
        </SectionShell>
    );
}

function renderBlock(block: BlockConfig) {
    switch (block.type) {
        case "hero":
            return <HeroBlockView block={block as HeroBlock} />;
        case "gallery":
            return <GalleryBlockView block={block as GalleryBlock} />;
        case "menu":
            return <MenuBlockView block={block as MenuBlock} />;
        case "map":
            return <MapBlockView block={block as MapBlock} />;
        case "hours":
            return <HoursBlockView block={block as HoursBlock} />;
        case "cta":
            return <CtaBlockView block={block as CtaBlock} />;
        default:
            return null;
    }
}

const TICKER_ITEMS = ["Single-origin espresso", "All-day plates", "Oat & almond milk", "Fresh pastries daily", "Walk-ins welcome", "Harbor Lane · Demo City"];

function CafeTicker() {
    return (
        <div className="cafe-ticker border-y border-[#faf4ea]/10 bg-[#2c1b12] py-3" aria-hidden="true">
            <div className="cafe-ticker__track font-mono text-[11px] uppercase tracking-[0.22em] text-[#faf4ea]/70">
                {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, index) => (
                    <span key={`${item}-${index}`} className="inline-flex items-center gap-11">
                        {item}
                        <span className="h-1 w-1 rounded-full bg-[#c4a35a]/70" />
                    </span>
                ))}
            </div>
        </div>
    );
}

export default function BlockRenderer({ blocks, className, renderUnknownBlock }: BlockRendererProps) {
    const normalizedBlocks = parseBlocks(blocks);

    if (normalizedBlocks.length === 0) {
        return null;
    }

    return (
        <div className={cx("space-y-8", className)}>
            {normalizedBlocks.map((block, index) => {
                const renderedBlock = renderBlock(block);

                if (renderedBlock) {
                    if (block.type === "hero") {
                        return (
                            <div key={`hero-${index}`}>
                                {renderedBlock}
                                <div className="mt-8">
                                    <CafeTicker />
                                </div>
                            </div>
                        );
                    }

                    return (
                        <CafeReveal key={`${block.type}-${index}`} as="section">
                            {renderedBlock}
                        </CafeReveal>
                    );
                }

                return renderUnknownBlock ? <div key={`${block.type}-${index}`}>{renderUnknownBlock(block, index)}</div> : null;
            })}
        </div>
    );
}
