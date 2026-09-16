"use client";

import { useState } from "react";

// Generates a distinct "3D-looking" icon per miner using gradients + a
// bevel highlight, entirely in code (no image files). Each miner's
// colorFrom/colorTo (lib/minerCatalog.ts) drives the gradient, so every
// tier reads as visually distinct at a glance.
//
// If `asset` is given, tries to load the real PNG first — but falls back
// to the generated SVG automatically if that file doesn't exist (onError),
// instead of showing a broken-image icon.

export function MinerIcon({
  colorFrom,
  colorTo,
  tier,
  size = 56,
  asset,
}: {
  colorFrom: string;
  colorTo: string;
  tier: number;
  size?: number;
  asset?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  if (asset && !imgFailed) {
    return (
      <img
        src={`/miners/${asset}`}
        alt=""
        width={size}
        height={size}
        onError={() => setImgFailed(true)}
        style={{ display: "block", objectFit: "contain", filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.45))" }}
      />
    );
  }

  const gradId = `mg-${colorFrom.replace("#", "")}-${colorTo.replace("#", "")}`;
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

      <rect x="6" y="40" width="52" height="14" rx="4" fill="#161013" stroke="#000" strokeOpacity="0.3" />
      <polygon
        points={facetPoints(facets)}
        fill={`url(#${gradId})`}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="1"
      />
      <polygon points={facetPoints(facets, 0.55)} fill={`url(#${gradId}-hl)`} opacity="0.7" />

      {Array.from({ length: Math.min(tier, 10) }).map((_, i) => (
        <circle key={i} cx={10 + i * 4.6} cy={50} r="1.3" fill={colorFrom} opacity="0.9" />
      ))}
    </svg>
  );
}

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
