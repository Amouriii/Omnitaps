import { buildLogoMarkSvg } from "../brand/logoMark";

/**
 * The Omnitaps LogoMark, drawn from the shared artwork in src/brand/logoMark.ts.
 * Geometry/palette live there; this component only handles React rendering.
 * Pass text-* classes via `className` to tint, or wrap in a colored element.
 */
export default function LogoMark({ className = "" }) {
    return (
        <span
            className={`inline-block leading-none ${className}`}
            style={{ display: "inline-flex" }}
            dangerouslySetInnerHTML={{ __html: buildLogoMarkSvg({ responsive: true }) }}
            aria-hidden="true"
        />
    );
}
