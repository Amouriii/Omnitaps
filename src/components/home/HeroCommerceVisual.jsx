const PAYMENT_METHODS = ["Apple Pay", "Google Pay", "Cards"];

/**
 * Presentation layer for the homepage hero. The live QR menu remains the
 * interactive centerpiece; this shell adds a restrained connected-commerce
 * signal around it so the platform story includes mobile payments without
 * pretending the decorative rail is a checkout flow.
 */
export default function HeroCommerceVisual({ children, phase = "idle" }) {
    const isDemoActive = phase !== "idle" && phase !== "scanning";

    return (
        <div className={`hero-visual-shell ${isDemoActive ? "is-demo-active" : ""}`.trim()}>
            <div className="hero-visual-frame" aria-hidden="true">
                <span className="hero-visual-frame__corner hero-visual-frame__corner--tl" />
                <span className="hero-visual-frame__corner hero-visual-frame__corner--tr" />
                <span className="hero-visual-frame__corner hero-visual-frame__corner--bl" />
                <span className="hero-visual-frame__corner hero-visual-frame__corner--br" />
                <span className="hero-visual-frame__grid" />
                <span className="hero-visual-frame__orbit hero-visual-frame__orbit--outer" />
                <span className="hero-visual-frame__orbit hero-visual-frame__orbit--inner" />
                <span className="hero-visual-frame__beam" />
            </div>

            <div className="hero-visual-hud" aria-hidden="true">
                <span className="hero-visual-hud__signal">
                    <span className="hero-visual-hud__dot" />
                    Connected commerce
                </span>
                <span className="hero-visual-hud__code">OT / 01</span>
            </div>

            <div className="hero-visual-center">
                {children}
            </div>

            <div className="hero-visual-node hero-visual-node--left" aria-hidden="true">
                <span className="hero-visual-node__index">01</span>
                <span>
                    <strong>QR menu</strong>
                    <small>syncing live</small>
                </span>
            </div>

            <div className="hero-visual-node hero-visual-node--right" aria-hidden="true">
                <span className="hero-visual-node__index hero-visual-node__index--brass">02</span>
                <span>
                    <strong>Mobile pay</strong>
                    <small>one connected layer</small>
                </span>
            </div>

            <div className="hero-payment-rail" aria-hidden="true">
                <div className="hero-payment-rail__topline">
                    <span>Payment methods</span>
                    <span className="hero-payment-rail__status">ready to connect</span>
                </div>
                <div className="hero-payment-rail__methods">
                    {PAYMENT_METHODS.map((method, index) => (
                        <span key={method} style={{ "--payment-delay": `${index * 120}ms` }}>
                            <i aria-hidden="true" />
                            {method}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
