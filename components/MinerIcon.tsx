"use client";

// Generates a distinct "3D-looking" icon per miner using gradients + a
// bevel highlight, entirely in code (no image files). Each miner's
// colorFrom/colorTo (lib/minerCatalog.ts) drives the gradient, so every
// tier reads as visually distinct at a glance — like a gem/machine getting
// shinier and more elaborate as tier goes up.
//
// To swap in a REAL image later (e.g. from Midjourney), just drop the file
// at /public/miners/<asset>.png (filename already defined per-miner in
// lib/minerCatalog.ts) and change MinerIcon to render <img src={...}> —
// no other code needs to change.

export function MinerIcon({
  colorFrom,
  colorTo,
  tier,
  size = 56,
}: {
  colorFrom: string;
  colorTo: string;
  tier: number;
  size?: number;
}) {
  const gradId = `mg-${colorFrom.replace("#", "")}-${colorTo.replace("#", "")}`;
  // Higher tiers get an extra facet (more elaborate silhouette) — purely visual.
  const facets = Math.min(3 + Math.floor(tier / 3), 6);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{ display: "block", filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.45))" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colorFrom} />
          <stop offset="100%" stopColor={colorTo} />
        </linearGradient>
        <linearGradient id={`${gradId}-hl`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* base plate — reads as a socket the crystal sits in */}
      <rect x="6" y="40" width="52" height="14" rx="4" fill="#161013" stroke="#000" strokeOpacity="0.3" />

      {/* faceted gem/crystal body, more points at higher tiers */}
      <polygon
        points={facetPoints(facets)}
        fill={`url(#${gradId})`}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="1"
      />
      {/* top bevel highlight for a glassy/3D feel */}
      <polygon points={facetPoints(facets, 0.55)} fill={`url(#${gradId}-hl)`} opacity="0.7" />

      {/* tier pip row along the base */}
      {Array.from({ length: Math.min(tier, 10) }).map((_, i) => (
        <circle
          key={i}
          cx={10 + i * 4.6}
          cy={50}
          r="1.3"
          fill={colorFrom}
          opacity="0.9"
        />
      ))}
    </svg>
  );
}

// Builds a symmetric faceted polygon (more sides = fancier gem) centered
// around (32, 30), scaled by `scale` for the inner highlight layer.
function facetPoints(sides: number, scale = 1): string {
  const cx = 32;
  const cy = 28;
  const rTop = 20 * scale;
  const rBottom = 24 * scale;
  const pts: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    const r = i % 2 === 0 ? rTop : rBottom;
    pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle) * 0.85]);
  }
  return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

