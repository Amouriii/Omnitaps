import type { ReactNode } from "react";
import { ExternalLink, Image as ImageIcon, MapPin, UtensilsCrossed } from "lucide-react";

type CtaConfig = {
    label: string;
    href: string;
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

type UnknownBlock = {
    type: string;
    [key: string]: unknown;
};

export type BlockConfig = HeroBlock | GalleryBlock | MenuBlock | MapBlock | UnknownBlock;

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
}: {
    eyebrow?: string;
    title?: string;
    description?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cx("rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8", className)}>
            {(eyebrow || title || description) && (
                <div className="mb-6 max-w-3xl">
                    {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p> : null}
                    {title ? <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">{title}</h2> : null}
                    {description ? <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base">{description}</p> : null}
                </div>
            )}
            {children}
        </section>
    );
}

function HeroBlockView({ block }: { block: HeroBlock }) {
    return (
        <SectionShell className="overflow-hidden bg-slate-950 text-white">
            <div className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-center">
                <div>
                    {block.eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{block.eyebrow}</p> : null}
                    <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-5xl">{block.title}</h1>
                    {block.description ? <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">{block.description}</p> : null}

                    <div className="mt-6 flex flex-wrap gap-3">
                        {block.primaryCta ? (
                            <a
                                href={block.primaryCta.href}
                                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                            >
                                {block.primaryCta.label}
                            </a>
                        ) : null}
                        {block.secondaryCta ? (
                            <a
                                href={block.secondaryCta.href}
                                className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                            >
                                {block.secondaryCta.label}
                            </a>
                        ) : null}
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4">
                    {block.badge ? (
                        <div className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                            {block.badge}
                        </div>
                    ) : null}
                    {block.imageUrl ? (
                        <img
                            src={block.imageUrl}
                            alt={block.imageAlt ?? block.title}
                            className="h-72 w-full rounded-2xl object-cover"
                        />
                    ) : (
                        <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 text-slate-300">
                            <div className="text-center">
                                <ImageIcon className="mx-auto h-9 w-9" />
                                <p className="mt-3 text-sm">Hero visual placeholder</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </SectionShell>
    );
}

function GalleryBlockView({ block }: { block: GalleryBlock }) {
    const columnsClassName =
        block.columns === 4 ? "sm:grid-cols-2 xl:grid-cols-4" : block.columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";

    return (
        <SectionShell eyebrow="Gallery" title={block.title} description={block.description}>
            <div className={cx("grid gap-4", columnsClassName)}>
                {block.images.map((image, index) => (
                    <figure key={`${image.src}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <img src={image.src} alt={image.alt ?? `Gallery image ${index + 1}`} className="h-56 w-full object-cover" />
                        {image.caption ? <figcaption className="border-t border-slate-200 px-4 py-3 text-sm text-slate-600">{image.caption}</figcaption> : null}
                    </figure>
                ))}
            </div>
        </SectionShell>
    );
}

function MenuBlockView({ block }: { block: MenuBlock }) {
    return (
        <SectionShell eyebrow="Menu" title={block.title} description={block.description}>
            <div className="grid gap-6 lg:grid-cols-2">
                {block.categories.map((category, categoryIndex) => (
                    <div key={`${category.title}-${categoryIndex}`} className="rounded-2xl border border-slate-200 p-5">
                        <div className="mb-4 flex items-center gap-2">
                            <UtensilsCrossed className="h-4 w-4 text-slate-500" />
                            <h3 className="text-lg font-semibold text-slate-950">{category.title}</h3>
                        </div>
                        {category.description ? <p className="mb-4 text-sm leading-6 text-slate-600">{category.description}</p> : null}
                        <div className="space-y-4">
                            {category.items.map((item, itemIndex) => (
                                <article key={`${item.name}-${itemIndex}`} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="font-medium text-slate-950">{item.name}</h4>
                                                {item.badge ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{item.badge}</span> : null}
                                            </div>
                                            {item.description ? <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p> : null}
                                        </div>
                                        {item.price ? <span className="shrink-0 text-sm font-semibold text-slate-950">{item.price}</span> : null}
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
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                        <div>
                            <h3 className="font-semibold text-slate-950">Location</h3>
                            {block.address ? <p className="mt-2 text-sm leading-6 text-slate-600">{block.address}</p> : null}
                        </div>
                    </div>

                    {block.directionsUrl ? (
                        <a
                            href={block.directionsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            Open directions
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    ) : null}
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    {block.embedUrl ? (
                        <iframe
                            title={block.title ?? "Map"}
                            src={block.embedUrl}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            className="h-80 w-full border-0"
                        />
                    ) : (
                        <div className="flex h-80 items-center justify-center px-6 text-center text-sm leading-6 text-slate-500">
                            Provide an embedUrl to render an interactive map.
                        </div>
                    )}
                </div>
            </div>
        </SectionShell>
    );
}

function renderBlock(block: BlockConfig) {
    switch (block.type) {
        case "hero":
            return <HeroBlockView block={block} />;
        case "gallery":
            return <GalleryBlockView block={block} />;
        case "menu":
            return <MenuBlockView block={block} />;
        case "map":
            return <MapBlockView block={block} />;
        default:
            return null;
    }
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
                    return <div key={`${block.type}-${index}`}>{renderedBlock}</div>;
                }

                return renderUnknownBlock ? <div key={`${block.type}-${index}`}>{renderUnknownBlock(block, index)}</div> : null;
            })}
        </div>
    );
}