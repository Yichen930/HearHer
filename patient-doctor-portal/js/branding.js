/** Product identity — BioHackzard is the team, not the product name. */

export const PRODUCT_NAME = "HearHer";
export const PRODUCT_TAGLINE = "Hear her. Care, connected.";
export const TEAM_NAME = "BioHackzard";
export const TEAM_CREDIT = `Produced by ${TEAM_NAME}`;

/** Official logo (1024×1024, transparent PNG embedded in SVG). */
export const LOGO_URL = "/logo/HearHer-logo-from-png.svg";

/** @type {Record<string, { w: number, h: number }>} */
const LOGO_DIMS = {
  sm: { w: 88, h: 88 },
  md: { w: 280, h: 280 },
  lg: { w: 280, h: 280 },
  login: { w: 280, h: 280 },
  hero: { w: 240, h: 240 },
};

/**
 * @param {{ size?: "sm" | "md" | "lg" | "login" | "hero", className?: string, onDark?: boolean }} [opts]
 */
export function renderLogo(opts = {}) {
  const size = opts.size || "md";
  const extra = opts.className ? ` ${opts.className}` : "";
  const dim = LOGO_DIMS[size] || LOGO_DIMS.md;
  const img = `<img src="${LOGO_URL}" alt="${PRODUCT_NAME}" width="${dim.w}" height="${dim.h}" class="brand-logo brand-logo--${size}${extra}" loading="lazy" decoding="async" />`;
  if (opts.onDark) {
    return `<div class="brand-logo-panel brand-logo-panel--${size}">${img}</div>`;
  }
  return img;
}

/**
 * Logo stacked above team credit, centered as a unit.
 * @param {{ size?: "sm" | "md" | "lg" | "login" | "hero", onDark?: boolean, className?: string }} [opts]
 */
export function renderBrandLockup(opts = {}) {
  const size = opts.size || "md";
  const onDark = Boolean(opts.onDark);
  const mod = onDark ? " brand-lockup--on-dark" : "";
  const creditMod = onDark ? " brand-lockup-credit--on-dark" : "";
  const logoClass = opts.className || "";
  return `<div class="brand-lockup brand-lockup--${size}${mod}">
    ${renderLogo({ size, onDark, className: logoClass })}
    <p class="brand-lockup-credit${creditMod}">${TEAM_CREDIT}</p>
  </div>`;
}

export function renderHeaderBrand(session) {
  const href = session
    ? session.role === "doctor"
      ? "#/doctor"
      : "#/patient"
    : "#/about";
  return `<a href="${href}" class="brand">${renderLogo({ size: "sm" })}</a>`;
}

export function renderProductFooter() {
  return `<footer class="app-footer">
    ${renderBrandLockup({ size: "sm" })}
  </footer>`;
}
