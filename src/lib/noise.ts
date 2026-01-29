// ============================================================================
// Proven Perlin/Simplex Noise Implementation
// Classic 3D Perlin noise that is guaranteed to work correctly
// Returns values in range [-1, 1]
// ============================================================================

// Permutation table (shuffled 0-255, doubled to avoid wrapping)
const perm = new Uint8Array([
  151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
  140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
  247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
  57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
  74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
  60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
  65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
  200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
  52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
  207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
  119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
  129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
  218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
  81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
  184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
  222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
]);

// Double the permutation table for easy wrapping
const p = new Uint8Array(512);
for (let i = 0; i < 256; i++) {
  p[i] = perm[i];
  p[256 + i] = perm[i];
}

// Gradient vectors for 3D
const grad3 = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
];

// Fade function for smooth interpolation
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// Linear interpolation
function lerpNoise(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

// Dot product of gradient and distance vector
function grad(hash: number, x: number, y: number, z: number): number {
  const g = grad3[hash % 12];
  return g[0] * x + g[1] * y + g[2] * z;
}

/**
 * Classic 3D Perlin Noise
 * Returns value in range [-1, 1]
 */
export function perlinNoise3D(x: number, y: number, z: number): number {
  // Find unit cube that contains point
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;

  // Find relative x, y, z of point in cube
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);

  // Compute fade curves for each of x, y, z
  const u = fade(x);
  const v = fade(y);
  const w = fade(z);

  // Hash coordinates of the 8 cube corners
  const A = p[X] + Y;
  const AA = p[A] + Z;
  const AB = p[A + 1] + Z;
  const B = p[X + 1] + Y;
  const BA = p[B] + Z;
  const BB = p[B + 1] + Z;

  // Add blended results from 8 corners of cube
  return lerpNoise(
    lerpNoise(
      lerpNoise(
        grad(p[AA], x, y, z),
        grad(p[BA], x - 1, y, z),
        u
      ),
      lerpNoise(
        grad(p[AB], x, y - 1, z),
        grad(p[BB], x - 1, y - 1, z),
        u
      ),
      v
    ),
    lerpNoise(
      lerpNoise(
        grad(p[AA + 1], x, y, z - 1),
        grad(p[BA + 1], x - 1, y, z - 1),
        u
      ),
      lerpNoise(
        grad(p[AB + 1], x, y - 1, z - 1),
        grad(p[BB + 1], x - 1, y - 1, z - 1),
        u
      ),
      v
    ),
    w
  );
}

/**
 * Fractal Brownian Motion - layered noise for more detail
 * Returns value in range approximately [-1, 1]
 */
export function fbm3D(x: number, y: number, z: number, octaves: number = 3): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * perlinNoise3D(x * frequency, y * frequency, z * frequency);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

/**
 * Normalized noise that returns values in [0, 1]
 */
export function noise3D(x: number, y: number, z: number): number {
  return (perlinNoise3D(x, y, z) + 1) * 0.5;
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

// Parse hex color to RGB
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
