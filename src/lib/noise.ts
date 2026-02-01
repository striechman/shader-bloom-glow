// ============================================================================
// Simplex 3D Noise - Exact port of GLSL implementation
// This matches the shader noise for pixel-perfect export
// ============================================================================

// mod289 - matches GLSL
function mod289_scalar(x: number): number {
  return x - Math.floor(x / 289.0) * 289.0;
}

function mod289_vec3(v: [number, number, number]): [number, number, number] {
  return [
    v[0] - Math.floor(v[0] / 289.0) * 289.0,
    v[1] - Math.floor(v[1] / 289.0) * 289.0,
    v[2] - Math.floor(v[2] / 289.0) * 289.0
  ];
}

function mod289_vec4(v: [number, number, number, number]): [number, number, number, number] {
  return [
    v[0] - Math.floor(v[0] / 289.0) * 289.0,
    v[1] - Math.floor(v[1] / 289.0) * 289.0,
    v[2] - Math.floor(v[2] / 289.0) * 289.0,
    v[3] - Math.floor(v[3] / 289.0) * 289.0
  ];
}

function permute_vec4(v: [number, number, number, number]): [number, number, number, number] {
  return mod289_vec4([
    ((v[0] * 34.0) + 1.0) * v[0],
    ((v[1] * 34.0) + 1.0) * v[1],
    ((v[2] * 34.0) + 1.0) * v[2],
    ((v[3] * 34.0) + 1.0) * v[3]
  ]);
}

function taylorInvSqrt_vec4(r: [number, number, number, number]): [number, number, number, number] {
  return [
    1.79284291400159 - 0.85373472095314 * r[0],
    1.79284291400159 - 0.85373472095314 * r[1],
    1.79284291400159 - 0.85373472095314 * r[2],
    1.79284291400159 - 0.85373472095314 * r[3]
  ];
}

function dot3(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function add3(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub3(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function mul3s(a: [number, number, number], s: number): [number, number, number] {
  return [a[0] * s, a[1] * s, a[2] * s];
}

function step3(edge: [number, number, number], x: [number, number, number]): [number, number, number] {
  return [
    x[0] < edge[0] ? 0 : 1,
    x[1] < edge[1] ? 0 : 1,
    x[2] < edge[2] ? 0 : 1
  ];
}

function min3(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [
    Math.min(a[0], b[0]),
    Math.min(a[1], b[1]),
    Math.min(a[2], b[2])
  ];
}

function max3(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [
    Math.max(a[0], b[0]),
    Math.max(a[1], b[1]),
    Math.max(a[2], b[2])
  ];
}

function floor3(v: [number, number, number]): [number, number, number] {
  return [Math.floor(v[0]), Math.floor(v[1]), Math.floor(v[2])];
}

/**
 * Simplex 3D Noise - Exact match to GLSL snoise(vec3 v)
 * Returns value in range [-1, 1]
 */
export function simplexNoise3D(vx: number, vy: number, vz: number): number {
  const C: [number, number] = [1.0 / 6.0, 1.0 / 3.0];
  const D: [number, number, number, number] = [0.0, 0.5, 1.0, 2.0];
  
  const v: [number, number, number] = [vx, vy, vz];
  
  // First corner
  const dotVCyyy = v[0] * C[1] + v[1] * C[1] + v[2] * C[1];
  const i: [number, number, number] = floor3([v[0] + dotVCyyy, v[1] + dotVCyyy, v[2] + dotVCyyy]);
  
  const dotICxxx = (i[0] + i[1] + i[2]) * C[0];
  const x0: [number, number, number] = [
    v[0] - i[0] + dotICxxx,
    v[1] - i[1] + dotICxxx,
    v[2] - i[2] + dotICxxx
  ];
  
  // Other corners
  const g = step3([x0[1], x0[2], x0[0]], x0);
  const l: [number, number, number] = [1.0 - g[0], 1.0 - g[1], 1.0 - g[2]];
  const i1 = min3([g[0], g[1], g[2]], [l[2], l[0], l[1]]);
  const i2 = max3([g[0], g[1], g[2]], [l[2], l[0], l[1]]);
  
  const x1: [number, number, number] = add3(sub3(x0, i1), [C[0], C[0], C[0]]);
  const x2: [number, number, number] = add3(sub3(x0, i2), [C[1], C[1], C[1]]);
  const x3: [number, number, number] = sub3(x0, [D[1], D[1], D[1]]);
  
  // Permutations
  const iMod = mod289_vec3(i);
  const pZ = permute_vec4([
    iMod[2] + 0.0,
    iMod[2] + i1[2],
    iMod[2] + i2[2],
    iMod[2] + 1.0
  ]);
  const pZY = permute_vec4([
    pZ[0] + iMod[1] + 0.0,
    pZ[1] + iMod[1] + i1[1],
    pZ[2] + iMod[1] + i2[1],
    pZ[3] + iMod[1] + 1.0
  ]);
  const p = permute_vec4([
    pZY[0] + iMod[0] + 0.0,
    pZY[1] + iMod[0] + i1[0],
    pZY[2] + iMod[0] + i2[0],
    pZY[3] + iMod[0] + 1.0
  ]);
  
  // Gradients
  const n_ = 0.142857142857; // 1/7
  const ns: [number, number, number] = [
    n_ * D[3] - D[0],   // 2/7
    n_ * D[1] - D[2],   // -0.5/7
    n_ * n_             // 1/49
  ];
  
  const j: [number, number, number, number] = [
    p[0] - 49.0 * Math.floor(p[0] * ns[2] * ns[2]),
    p[1] - 49.0 * Math.floor(p[1] * ns[2] * ns[2]),
    p[2] - 49.0 * Math.floor(p[2] * ns[2] * ns[2]),
    p[3] - 49.0 * Math.floor(p[3] * ns[2] * ns[2])
  ];
  
  const x_: [number, number, number, number] = [
    Math.floor(j[0] * ns[2]),
    Math.floor(j[1] * ns[2]),
    Math.floor(j[2] * ns[2]),
    Math.floor(j[3] * ns[2])
  ];
  const y_: [number, number, number, number] = [
    Math.floor(j[0] - 7.0 * x_[0]),
    Math.floor(j[1] - 7.0 * x_[1]),
    Math.floor(j[2] - 7.0 * x_[2]),
    Math.floor(j[3] - 7.0 * x_[3])
  ];
  
  const x: [number, number, number, number] = [
    x_[0] * ns[0] + ns[1],
    x_[1] * ns[0] + ns[1],
    x_[2] * ns[0] + ns[1],
    x_[3] * ns[0] + ns[1]
  ];
  const y: [number, number, number, number] = [
    y_[0] * ns[0] + ns[1],
    y_[1] * ns[0] + ns[1],
    y_[2] * ns[0] + ns[1],
    y_[3] * ns[0] + ns[1]
  ];
  const h: [number, number, number, number] = [
    1.0 - Math.abs(x[0]) - Math.abs(y[0]),
    1.0 - Math.abs(x[1]) - Math.abs(y[1]),
    1.0 - Math.abs(x[2]) - Math.abs(y[2]),
    1.0 - Math.abs(x[3]) - Math.abs(y[3])
  ];
  
  const b0: [number, number, number, number] = [x[0], x[1], y[0], y[1]];
  const b1: [number, number, number, number] = [x[2], x[3], y[2], y[3]];
  
  const s0: [number, number, number, number] = [
    Math.floor(b0[0]) * 2.0 + 1.0,
    Math.floor(b0[1]) * 2.0 + 1.0,
    Math.floor(b0[2]) * 2.0 + 1.0,
    Math.floor(b0[3]) * 2.0 + 1.0
  ];
  const s1: [number, number, number, number] = [
    Math.floor(b1[0]) * 2.0 + 1.0,
    Math.floor(b1[1]) * 2.0 + 1.0,
    Math.floor(b1[2]) * 2.0 + 1.0,
    Math.floor(b1[3]) * 2.0 + 1.0
  ];
  const sh: [number, number, number, number] = [
    h[0] < 0 ? -1 : 0,
    h[1] < 0 ? -1 : 0,
    h[2] < 0 ? -1 : 0,
    h[3] < 0 ? -1 : 0
  ];
  
  const a0: [number, number, number, number] = [
    b0[0] + s0[0] * sh[0],
    b0[2] + s0[2] * sh[0],
    b0[1] + s0[1] * sh[1],
    b0[3] + s0[3] * sh[1]
  ];
  const a1: [number, number, number, number] = [
    b1[0] + s1[0] * sh[2],
    b1[2] + s1[2] * sh[2],
    b1[1] + s1[1] * sh[3],
    b1[3] + s1[3] * sh[3]
  ];
  
  const p0: [number, number, number] = [a0[0], a0[1], h[0]];
  const p1: [number, number, number] = [a0[2], a0[3], h[1]];
  const p2: [number, number, number] = [a1[0], a1[1], h[2]];
  const p3: [number, number, number] = [a1[2], a1[3], h[3]];
  
  // Normalize gradients
  const norm = taylorInvSqrt_vec4([dot3(p0, p0), dot3(p1, p1), dot3(p2, p2), dot3(p3, p3)]);
  const p0n: [number, number, number] = mul3s(p0, norm[0]);
  const p1n: [number, number, number] = mul3s(p1, norm[1]);
  const p2n: [number, number, number] = mul3s(p2, norm[2]);
  const p3n: [number, number, number] = mul3s(p3, norm[3]);
  
  // Mix contributions
  let m: [number, number, number, number] = [
    Math.max(0.6 - dot3(x0, x0), 0.0),
    Math.max(0.6 - dot3(x1, x1), 0.0),
    Math.max(0.6 - dot3(x2, x2), 0.0),
    Math.max(0.6 - dot3(x3, x3), 0.0)
  ];
  m = [m[0] * m[0], m[1] * m[1], m[2] * m[2], m[3] * m[3]];
  
  return 42.0 * (
    m[0] * m[0] * dot3(p0n, x0) +
    m[1] * m[1] * dot3(p1n, x1) +
    m[2] * m[2] * dot3(p2n, x2) +
    m[3] * m[3] * dot3(p3n, x3)
  );
}

/**
 * Normalized noise that returns values in [0, 1]
 */
export function noise3D(x: number, y: number, z: number): number {
  return simplexNoise3D(x, y, z) * 0.5 + 0.5;
}

/**
 * Alias for raw noise [-1, 1]
 */
export function perlinNoise3D(x: number, y: number, z: number): number {
  return simplexNoise3D(x, y, z);
}

// Smoothstep utility
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Linear interpolation utility
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ============================================================================
// Color Space Conversions - sRGB ↔ Linear RGB
// These ensure exported colors match WebGL shader output exactly
// ============================================================================

// sRGB to Linear RGB (gamma decoding) - input 0-255, output 0-1
export function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 
    ? s / 12.92 
    : Math.pow((s + 0.055) / 1.055, 2.4);
}

// Linear RGB to sRGB (gamma encoding) - input 0-1, output 0-255
export function linearToSrgb(c: number): number {
  const s = c <= 0.0031308 
    ? c * 12.92 
    : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(255, s * 255)));
}

// Linear RGB to sRGB with dithering for smooth exports (no banding)
// Uses blue noise approximation via position-based dithering
export function linearToSrgbDithered(c: number, x: number, y: number): number {
  const s = c <= 0.0031308 
    ? c * 12.92 
    : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  const value = s * 255;
  
  // Bayer-like dithering pattern for smooth gradients
  // Use position to create a repeating pattern that breaks up banding
  const ditherMatrix = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5]
  ];
  const mx = x % 4;
  const my = y % 4;
  const threshold = (ditherMatrix[my][mx] / 16.0) - 0.5;
  
  // Apply subtle dithering (±0.5 pixel value)
  const dithered = value + threshold;
  
  return Math.max(0, Math.min(255, Math.round(dithered)));
}

// Parse hex color to RGB (sRGB 0-255)
export function parseColor(hex: string): { r: number; g: number; b: number } {
  // Handle shorthand hex (#RGB)
  if (hex.length === 4) {
    const r = parseInt(hex[1] + hex[1], 16);
    const g = parseInt(hex[2] + hex[2], 16);
    const b = parseInt(hex[3] + hex[3], 16);
    return { r, g, b };
  }
  
  // Standard hex (#RRGGBB)
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  // Validate parsed values
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    console.warn('Invalid hex color:', hex, '- using fallback');
    return { r: 128, g: 128, b: 128 }; // Gray fallback
  }
  
  return { r, g, b };
}

// Parse hex color and convert to Linear RGB (0-1 range) for shader-matching calculations
export function parseColorLinear(hex: string): { r: number; g: number; b: number } {
  const srgb = parseColor(hex);
  return {
    r: srgbToLinear(srgb.r),
    g: srgbToLinear(srgb.g),
    b: srgbToLinear(srgb.b)
  };
}
