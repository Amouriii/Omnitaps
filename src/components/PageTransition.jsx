import { useLocation } from "react-router-dom";
import { isDemoCafePath } from "./demo/CafeThemeGate";

/**
 * Smooth arrival fade between routes.
 *
 * The app uses <BrowserRouter> (not a data router), so React Router's
 * experimental view-transition APIs don't apply. Instead: remount a wrapper
 * keyed by the pathname and play a short opacity fade on every arrival —
 * the same proven pattern the café theme already uses (.demo-cafe-route).
 * The keyed remount replays the CSS animation automatically on first load
 * and on every navigation; hash-only changes (same pathname) do not remount.
 *
 * Deliberately opacity-only: no transform. A transform would turn this
 * wrapper into the containing block for fixed-position descendants and
 * break sticky/fixed overlays inside pages.
 *
 * Café-themed paths are skipped: /s/demo etc. already animate via
 * .demo-cafe-route and get the intro overlay — fading twice would feel laggy.
 */
export default function PageTransition({ children }) {
    const location = useLocation();
    if (isDemoCafePath(location.pathname)) {
        return children;
    }
    return (
        <div key={location.pathname} className="route-fade">
            {children}
        </div>
    );
}