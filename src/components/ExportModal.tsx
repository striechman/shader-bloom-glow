import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, Download, Image, FileImage, Code, Copy, Check, Monitor, Printer, LayoutGrid, Share2, Video, Play } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { GradientConfig, exportCategories, ExportCategory } from '@/types/gradient';
import { Slider } from '@/components/ui/slider';
import { ExportPreview } from '@/components/ExportPreview';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: GradientConfig;
}

type ExportTab = 'image' | 'video' | 'css';

const categoryIcons: Record<ExportCategory, React.ReactNode> = {
  social: <Share2 className="w-4 h-4" />,
  web: <Monitor className="w-4 h-4" />,
  print: <Printer className="w-4 h-4" />,
  banner: <LayoutGrid className="w-4 h-4" />,
};

const categoryLabels: Record<ExportCategory, string> = {
  social: 'Social',
  web: 'Web',
  print: 'Print',
  banner: 'Banner',
};

const videoResolutions = [
  { label: '720p', width: 1280, height: 720 },
  { label: '1080p', width: 1920, height: 1080 },
  { label: '4K', width: 3840, height: 2160 },
];

// ============================================================================
// Simplex 3D Noise - Exact port of GLSL shader implementation
// Matches CustomMeshGradient.tsx shader for pixel-perfect export
// ============================================================================

// Helper: mod289 (matches GLSL mod289)
function mod289(x: number): number {
  return x - Math.floor(x / 289.0) * 289.0;
}

// Helper: permute (matches GLSL permute)
function permute(x: number): number {
  return mod289(((x * 34.0) + 1.0) * x);
}

// Helper: taylorInvSqrt (matches GLSL)
function taylorInvSqrt(r: number): number {
  return 1.79284291400159 - 0.85373472095314 * r;
}

// Full 3D Simplex Noise - exact match to shader snoise(vec3 v)
function simplexNoise3D(x: number, y: number, z: number): number {
  const C_x = 1.0 / 6.0;
  const C_y = 1.0 / 3.0;
  
  // First corner
  const dot_v_Cyyy = x * C_y + y * C_y + z * C_y;
  const i = Math.floor(x + dot_v_Cyyy);
  const j = Math.floor(y + dot_v_Cyyy);
  const k = Math.floor(z + dot_v_Cyyy);
  
  const dot_ijk_Cxxx = (i + j + k) * C_x;
  const x0 = x - (i - dot_ijk_Cxxx);
  const y0 = y - (j - dot_ijk_Cxxx);
  const z0 = z - (k - dot_ijk_Cxxx);
  
  // Offsets for second corner
  let i1: number, j1: number, k1: number;
  let i2: number, j2: number, k2: number;
  
  if (x0 >= y0) {
    if (y0 >= z0) {
      i1 = 1; j1 = 0; k1 = 0;
      i2 = 1; j2 = 1; k2 = 0;
    } else if (x0 >= z0) {
      i1 = 1; j1 = 0; k1 = 0;
      i2 = 1; j2 = 0; k2 = 1;
    } else {
      i1 = 0; j1 = 0; k1 = 1;
      i2 = 1; j2 = 0; k2 = 1;
    }
  } else {
    if (y0 < z0) {
      i1 = 0; j1 = 0; k1 = 1;
      i2 = 0; j2 = 1; k2 = 1;
    } else if (x0 < z0) {
      i1 = 0; j1 = 1; k1 = 0;
      i2 = 0; j2 = 1; k2 = 1;
    } else {
      i1 = 0; j1 = 1; k1 = 0;
      i2 = 1; j2 = 1; k2 = 0;
    }
  }
  
  // Offsets for remaining corners
  const x1 = x0 - i1 + C_x;
  const y1 = y0 - j1 + C_x;
  const z1 = z0 - k1 + C_x;
  const x2 = x0 - i2 + C_y; // 2.0 * C.x = C.y
  const y2 = y0 - j2 + C_y;
  const z2 = z0 - k2 + C_y;
  const x3 = x0 - 0.5; // -1.0 + 3.0 * C.x = -0.5
  const y3 = y0 - 0.5;
  const z3 = z0 - 0.5;
  
  // Permutations
  const ii = mod289(i);
  const jj = mod289(j);
  const kk = mod289(k);
  
  const p0 = permute(permute(permute(kk) + jj) + ii);
  const p1 = permute(permute(permute(kk + k1) + jj + j1) + ii + i1);
  const p2 = permute(permute(permute(kk + k2) + jj + j2) + ii + i2);
  const p3 = permute(permute(permute(kk + 1) + jj + 1) + ii + 1);
  
  // Gradients
  const n_ = 0.142857142857; // 1/7
  const ns_x = n_ * 2.0 - 1.0; // -D.x = 0.0 -> ns.x = n_ * D.w - D.x = n_ * 2 - 0
  const ns_y = n_ * 0.5 - 0.0; // n_ * D.y - D.z
  const ns_z = n_ * n_; // D.z * D.z
  
  // Calculate gradients for each corner
  const calcGrad = (p: number) => {
    const j = p - 49.0 * Math.floor(p * ns_z * ns_z);
    const x_ = Math.floor(j * ns_z);
    const y_ = Math.floor(j - 7.0 * x_);
    const gx = x_ * ns_x + ns_y;
    const gy = y_ * ns_x + ns_y;
    const gz = 1.0 - Math.abs(gx) - Math.abs(gy);
    
    // Normalize gradient
    const len = Math.sqrt(gx * gx + gy * gy + gz * gz);
    const invLen = len > 0 ? taylorInvSqrt(gx * gx + gy * gy + gz * gz) : 0;
    return { x: gx * invLen, y: gy * invLen, z: gz * invLen };
  };
  
  const g0 = calcGrad(p0);
  const g1 = calcGrad(p1);
  const g2 = calcGrad(p2);
  const g3 = calcGrad(p3);
  
  // Mix contributions
  let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
  
  let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
  if (t0 >= 0) {
    t0 *= t0;
    n0 = t0 * t0 * (g0.x * x0 + g0.y * y0 + g0.z * z0);
  }
  
  let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
  if (t1 >= 0) {
    t1 *= t1;
    n1 = t1 * t1 * (g1.x * x1 + g1.y * y1 + g1.z * z1);
  }
  
  let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
  if (t2 >= 0) {
    t2 *= t2;
    n2 = t2 * t2 * (g2.x * x2 + g2.y * y2 + g2.z * z2);
  }
  
  let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
  if (t3 >= 0) {
    t3 *= t3;
    n3 = t3 * t3 * (g3.x * x3 + g3.y * y3 + g3.z * z3);
  }
  
  // Scale to [-1, 1]
  return 32.0 * (n0 + n1 + n2 + n3);
}

// Legacy 2D noise for sphere/plane modes (kept for backwards compatibility)
function simplexNoise2D(x: number, y: number): number {
  return simplexNoise3D(x, y, 0);
}

// Parse hex color to RGB
function parseColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

// Helper functions
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

async function captureVisibleWebGLCanvasToCanvas(
  sourceCanvas: HTMLCanvasElement,
  targetCtx: CanvasRenderingContext2D,
  targetWidth: number,
  targetHeight: number
): Promise<void> {
  // Wait for at least one paint so we capture the latest frame
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const gl =
    (sourceCanvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
    (sourceCanvas.getContext('webgl') as WebGLRenderingContext | null);

  // If we can't access WebGL context, fallback to drawImage (may be lower fidelity)
  if (!gl) {
    targetCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
    return;
  }

  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  const pixels = new Uint8Array(srcW * srcH * 4);

  try {
    gl.readPixels(0, 0, srcW, srcH, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  } catch {
    // Some browsers can block readPixels depending on context state
    targetCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
    return;
  }

  // Flip Y axis (WebGL is bottom-left origin)
  const imageData = new ImageData(srcW, srcH);
  for (let y = 0; y < srcH; y++) {
    const srcRow = (srcH - 1 - y) * srcW * 4;
    const dstRow = y * srcW * 4;
    imageData.data.set(pixels.subarray(srcRow, srcRow + srcW * 4), dstRow);
  }

  const tmp = document.createElement('canvas');
  tmp.width = srcW;
  tmp.height = srcH;
  const tmpCtx = tmp.getContext('2d');
  if (!tmpCtx) {
    targetCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
    return;
  }
  tmpCtx.putImageData(imageData, 0, 0);

  targetCtx.imageSmoothingEnabled = true;
  (targetCtx as any).imageSmoothingQuality = 'high';
  targetCtx.drawImage(tmp, 0, 0, targetWidth, targetHeight);
}

// ============================================================================
// High-Quality Mesh Gradient Renderer
// Renders the gradient at target resolution using the exact same algorithm
// as the GLSL shader, producing pixel-perfect output at any resolution.
// ============================================================================
async function renderMeshGradientHighQuality(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: GradientConfig
): Promise<void> {
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  
  const color0 = parseColor(config.color0 ?? '#000000');
  const color1 = parseColor(config.color1);
  const color2 = parseColor(config.color2);
  const color3 = parseColor(config.color3);
  
  // Shader parameters - exactly matching CustomMeshGradient.tsx
  const noiseScale = config.meshNoiseScale ?? 1.0;
  const blurFactor = ((config.meshBlur ?? 50) / 100) * 0.5;
  const time = (config.frozenTime ?? 0) * 0.5; // Match shader: uTime * 0.5
  const freq = Math.max(0.1, config.uFrequency);
  const density = Math.max(0, config.uDensity);
  const strength = Math.max(0, config.uStrength);
  const grainEnabled = config.grain;
  const grainIntensity = grainEnabled ? (config.grainIntensity ?? 50) / 100 : 0;
  
  // Color weight thresholds (4 colors)
  const w0 = (config.colorWeight0 ?? 30) / 100;
  const w1 = (config.colorWeight1 ?? 23) / 100;
  const w2 = (config.colorWeight2 ?? 24) / 100;
  const threshold0 = w0;
  const threshold1 = w0 + w1;
  const threshold2 = w0 + w1 + w2;
  
  // Process each pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const v = y / height;
      
      // Center UV for edge distance calculation (matching shader)
      const centeredU = u - 0.5;
      const centeredV = v - 0.5;
      
      // Edge distance (0 at edges, 1 at center)
      const edgeDistX = 1.0 - Math.abs(centeredU) * 2.0;
      const edgeDistY = 1.0 - Math.abs(centeredV) * 2.0;
      const edgeDist = Math.min(edgeDistX, edgeDistY);
      
      // Smooth falloff from edges
      const edgeFade = smoothstep(0.0, 0.3, edgeDist);
      
      // Multi-octave 3D noise (exactly matching shader)
      const noiseX = u * noiseScale * freq;
      const noiseY = v * noiseScale * freq;
      
      const n1 = simplexNoise3D(noiseX, noiseY, time) * 0.5 + 0.5;
      const n2 = simplexNoise3D(noiseX * 2 + 100, noiseY * 2 + 100, time) * (0.20 + 0.10 * density);
      const n3 = simplexNoise3D(noiseX * 4 + 200, noiseY * 4 + 200, time) * (0.10 + 0.06 * density);
      
      // Combine and normalize (matching shader)
      let noise = (n1 + n2 + n3) / 1.375;
      
      // Apply strength (matching shader: pow(noise, 1.0 + strength * 0.18))
      noise = Math.pow(Math.max(0, Math.min(1, noise)), 1.0 + strength * 0.18);
      
      // Color mixing with smooth edges (matching shader - 4 colors)
      const edge0 = smoothstep(threshold0 - blurFactor, threshold0 + blurFactor, noise);
      const edge1 = smoothstep(threshold1 - blurFactor, threshold1 + blurFactor, noise);
      const edge2 = smoothstep(threshold2 - blurFactor, threshold2 + blurFactor, noise);
      
      // Mix colors: noise < threshold0 = color0, threshold0-threshold1 = color1, etc.
      let r = lerp(color0.r, color1.r, edge0);
      let g = lerp(color0.g, color1.g, edge0);
      let b = lerp(color0.b, color1.b, edge0);
      
      r = lerp(r, color2.r, edge1);
      g = lerp(g, color2.g, edge1);
      b = lerp(b, color2.b, edge1);
      
      r = lerp(r, color3.r, edge2);
      g = lerp(g, color3.g, edge2);
      b = lerp(b, color3.b, edge2);
      
      // Apply edge fade - corners blend to color0 (black) (matching shader)
      r = lerp(color0.r, r, edgeFade);
      g = lerp(color0.g, g, edgeFade);
      b = lerp(color0.b, b, edgeFade);
      
      // Apply grain if enabled (matching shader)
      if (grainIntensity > 0) {
        const grainNoise = simplexNoise3D(u * 220.0, v * 220.0, time * 1.4);
        const grainAmt = (grainNoise * 0.5) * (grainIntensity * 0.18) * 255;
        r = Math.max(0, Math.min(255, r + grainAmt));
        g = Math.max(0, Math.min(255, g + grainAmt));
        b = Math.max(0, Math.min(255, b + grainAmt));
      }
      
      const idx = (y * width + x) * 4;
      data[idx] = Math.round(r);
      data[idx + 1] = Math.round(g);
      data[idx + 2] = Math.round(b);
      data[idx + 3] = 255;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

// Render gradient based on type - for non-mesh modes (sphere, plane, waterPlane)
async function renderGradientToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: GradientConfig
): Promise<void> {
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  
  const color0 = parseColor(config.color0 ?? '#000000');
  const color1 = parseColor(config.color1);
  const color2 = parseColor(config.color2);
  const color3 = parseColor(config.color3);
  
  const w0 = (config.colorWeight0 ?? 30) / 100;
  const w1 = (config.colorWeight1 ?? 23) / 100;
  const w2 = (config.colorWeight2 ?? 24) / 100;
  const threshold0 = w0;
  const threshold1 = w0 + w1;
  const threshold2 = w0 + w1 + w2;
  
  const time = config.frozenTime ?? 0;
  
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const v = y / height;
      
      let blendValue: number;
      
      if (config.type === 'sphere') {
        // Sphere mode: radial gradient with 3D-like depth + noise for organic look
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
        
        // Add subtle noise for organic feel
        const noise = simplexNoise2D(u * 3 + time * 0.05, v * 3) * 0.15;
        
        // Create sphere-like falloff with angle variation
        const angle = Math.atan2(dy, dx);
        const angleVar = Math.sin(angle * 2 + time * 0.1) * 0.1;
        
        // Combine distance, angle variation, and noise
        blendValue = dist * 0.7 + angleVar + noise + 0.15;
        blendValue = Math.max(0, Math.min(1, blendValue));
      } else if (config.type === 'plane') {
        // Plane mode: diagonal gradient with subtle noise
        const diagonal = (u + v) / 2;
        const noise = simplexNoise2D(u * 2, v * 2 + time * 0.05) * 0.1;
        blendValue = diagonal + noise;
      } else if (config.type === 'waterPlane') {
        // Water mode: wavy gradient
        const wave1 = Math.sin(u * 4 + time * 0.2) * 0.1;
        const wave2 = Math.sin(v * 6 + time * 0.15) * 0.08;
        const noise = simplexNoise2D(u * 3, v * 3 + time * 0.1) * 0.15;
        blendValue = (u + v) / 2 + wave1 + wave2 + noise;
      } else {
        // Fallback: simple diagonal
        blendValue = (u + v) / 2;
      }
      
      blendValue = Math.max(0, Math.min(1, blendValue));
      
      // Apply color weights with soft transitions (4 colors)
      const blur = 0.12;
      
      const edge0 = smoothstep(threshold0 - blur, threshold0 + blur, blendValue);
      const edge1 = smoothstep(threshold1 - blur, threshold1 + blur, blendValue);
      const edge2 = smoothstep(threshold2 - blur, threshold2 + blur, blendValue);
      
      // Mix colors based on edges (4 colors)
      let r = lerp(color0.r, color1.r, edge0);
      let g = lerp(color0.g, color1.g, edge0);
      let b = lerp(color0.b, color1.b, edge0);
      
      r = lerp(r, color2.r, edge1);
      g = lerp(g, color2.g, edge1);
      b = lerp(b, color2.b, edge1);
      
      r = lerp(r, color3.r, edge2);
      g = lerp(g, color3.g, edge2);
      b = lerp(b, color3.b, edge2);
      
      const idx = (y * width + x) * 4;
      data[idx] = Math.round(r);
      data[idx + 1] = Math.round(g);
      data[idx + 2] = Math.round(b);
      data[idx + 3] = 255;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

export const ExportModal = ({ isOpen, onClose, config }: ExportModalProps) => {
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);
  const recordingTimeoutRef = useRef<number | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<ExportCategory>('social');
  const [selectedSize, setSelectedSize] = useState(exportCategories.social[0]);
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [useCustomSize, setUseCustomSize] = useState(false);
  const [format, setFormat] = useState<'png' | 'jpg'>('png');
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<ExportTab>('image');
  const [copied, setCopied] = useState(false);
  
  // Video export settings
  const [videoDuration, setVideoDuration] = useState(5);
  const [videoResolution, setVideoResolution] = useState(videoResolutions[1]);
  const [videoProgress, setVideoProgress] = useState(0);
  
  // Export offset for panning the gradient
  const [exportOffset, setExportOffset] = useState({ x: 0, y: 0 });

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      // Cleanup any running recordings
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsExporting(false);
      setVideoProgress(0);
    }
  }, [isOpen]);

  const handleCategoryChange = (category: ExportCategory) => {
    setSelectedCategory(category);
    setSelectedSize(exportCategories[category][0]);
    setUseCustomSize(false);
  };

  const generateCSSCode = () => {
    if (!config) return '';
    
    const w0 = config.colorWeight0 ?? 30;
    const w1 = w0 + (config.colorWeight1 ?? 23);
    const w2 = w1 + (config.colorWeight2 ?? 24);
    const animDuration = Math.round(10 / config.speed);
    
    return `/* Static Gradient (4 colors with 30% black base) */
.gradient-background {
  background: linear-gradient(
    135deg,
    ${config.color0 ?? '#000000'} 0%,
    ${config.color0 ?? '#000000'} ${w0}%,
    ${config.color1} ${w0}%,
    ${config.color1} ${w1}%,
    ${config.color2} ${w1}%,
    ${config.color2} ${w2}%,
    ${config.color3} ${w2}%,
    ${config.color3} 100%
  );
}

/* Smooth gradient variant */
.gradient-background-smooth {
  background: linear-gradient(
    135deg,
    ${config.color0 ?? '#000000'} 0%,
    ${config.color1} 33%,
    ${config.color2} 66%,
    ${config.color3} 100%
  );
}

/* Radial gradient variant */
.gradient-background-radial {
  background: radial-gradient(
    ellipse at center,
    ${config.color1} 0%,
    ${config.color2} 40%,
    ${config.color0 ?? '#000000'} 100%
  );
}

/* Conic gradient variant */
.gradient-background-conic {
  background: conic-gradient(
    from 0deg,
    ${config.color0 ?? '#000000'},
    ${config.color1},
    ${config.color2},
    ${config.color3},
    ${config.color0 ?? '#000000'}
  );
}

/* ========== ANIMATED GRADIENTS ========== */

/* Animated gradient - color shift */
@keyframes gradient-shift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.gradient-animated {
  background: linear-gradient(
    135deg,
    ${config.color0 ?? '#000000'},
    ${config.color1},
    ${config.color2},
    ${config.color3},
    ${config.color2},
    ${config.color1},
    ${config.color0 ?? '#000000'}
  );
  background-size: 400% 400%;
  animation: gradient-shift ${animDuration}s ease infinite;
}

/* Animated rotating conic gradient */
@keyframes gradient-rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.gradient-animated-rotate {
  position: relative;
  overflow: hidden;
}

.gradient-animated-rotate::before {
  content: '';
  position: absolute;
  inset: -50%;
  background: conic-gradient(
    from 0deg,
    ${config.color0 ?? '#000000'},
    ${config.color1},
    ${config.color2},
    ${config.color3},
    ${config.color0 ?? '#000000'}
  );
  animation: gradient-rotate ${animDuration}s linear infinite;
}

/* Animated pulse gradient */
@keyframes gradient-pulse {
  0%, 100% {
    opacity: 1;
    filter: blur(0px);
  }
  50% {
    opacity: 0.8;
    filter: blur(20px);
  }
}

.gradient-animated-pulse {
  background: radial-gradient(
    ellipse at center,
    ${config.color1} 0%,
    ${config.color2} 50%,
    ${config.color3} 100%
  );
  animation: gradient-pulse ${animDuration}s ease-in-out infinite;
}`;
  };

  const handleCopyCSS = async () => {
    const css = generateCSSCode();
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      toast.success('CSS copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = css;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        toast.success('CSS copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error('Failed to copy');
      }
      document.body.removeChild(textarea);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const targetWidth = useCustomSize ? customWidth : selectedSize.width;
      const targetHeight = useCustomSize ? customHeight : selectedSize.height;

      // Create high-resolution offscreen canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = targetWidth;
      tempCanvas.height = targetHeight;
      const ctx = tempCanvas.getContext('2d');
      
      if (!ctx) {
        toast.error('Failed to create export context');
        setIsExporting(false);
        return;
      }

      if (!config) {
        toast.error('Missing gradient config');
        setIsExporting(false);
        return;
      }

      // Check if we're in Mesh mode - use high-quality JS render instead of WebGL capture
      const isMeshMode = config.wireframe === true;

      if (isMeshMode) {
        // ========== Mesh Mode: Render at full resolution using JS ==========
        // This produces pixel-perfect output that exactly matches the shader
        // at any resolution, with no scaling artifacts
        await renderMeshGradientHighQuality(ctx, targetWidth, targetHeight, config);
      } else {
        // ========== Sphere/Plane/Water Mode: Capture WebGL canvas ==========
        const gradientStage = document.querySelector('#gradient-stage');
        const sourceCanvas = (gradientStage?.querySelector('canvas') ?? null) as HTMLCanvasElement | null;

        if (!sourceCanvas) {
          toast.error('Canvas not found');
          setIsExporting(false);
          return;
        }

        await captureVisibleWebGLCanvasToCanvas(sourceCanvas, ctx, targetWidth, targetHeight);

        // Heal corner artifacts for WebGL capture (not needed for JS render)
        {
          const fadeSize = Math.min(targetWidth, targetHeight) * 0.18;
          const sampleSize = Math.max(8, Math.floor(fadeSize * 0.08));
          const sampleInset = Math.max(6, Math.floor(fadeSize * 0.32));

          const safeSample = (sx: number, sy: number) => {
            try {
              const x = Math.max(0, Math.min(targetWidth - sampleSize, Math.floor(sx)));
              const y = Math.max(0, Math.min(targetHeight - sampleSize, Math.floor(sy)));
              const img = ctx.getImageData(x, y, sampleSize, sampleSize).data;
              let r = 0, g = 0, b = 0;
              const n = img.length / 4;
              for (let i = 0; i < img.length; i += 4) {
                r += img[i];
                g += img[i + 1];
                b += img[i + 2];
              }
              r = Math.round(r / n);
              g = Math.round(g / n);
              b = Math.round(b / n);
              return { r, g, b };
            } catch {
              return config ? parseColor(config.color3) : { r: 0, g: 0, b: 0 };
            }
          };

          const corners = [
            { cx: 0, cy: 0, rx: 0, ry: 0, sx: sampleInset, sy: sampleInset },
            { cx: targetWidth, cy: 0, rx: targetWidth - fadeSize, ry: 0, sx: targetWidth - sampleInset - sampleSize, sy: sampleInset },
            { cx: 0, cy: targetHeight, rx: 0, ry: targetHeight - fadeSize, sx: sampleInset, sy: targetHeight - sampleInset - sampleSize },
            { cx: targetWidth, cy: targetHeight, rx: targetWidth - fadeSize, ry: targetHeight - fadeSize, sx: targetWidth - sampleInset - sampleSize, sy: targetHeight - sampleInset - sampleSize },
          ];

          ctx.save();
          ctx.globalCompositeOperation = 'source-over';

          for (const c of corners) {
            const rgb = safeSample(c.sx, c.sy);
            const solid = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
            const mid = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.75)`;
            const trans = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`;

            const g = ctx.createRadialGradient(c.cx, c.cy, 0, c.cx, c.cy, fadeSize);
            g.addColorStop(0, solid);
            g.addColorStop(0.35, mid);
            g.addColorStop(1, trans);

            ctx.fillStyle = g;
            ctx.fillRect(c.rx, c.ry, fadeSize, fadeSize);
          }

          ctx.restore();
        }

        // Add weight overlay for static mode (matches on-screen behavior)
        const isFrozen = config.frozenTime !== null;
        const isStaticMode = !config.animate || isFrozen;

        if (isStaticMode) {
          const w1 = config.colorWeight1;
          const w2 = w1 + config.colorWeight2;
          const feather = 6;
          const f1 = Math.max(0, w1 - feather) / 100;
          const f2 = Math.min(100, w1 + feather) / 100;
          const f3 = Math.max(0, w2 - feather) / 100;
          const f4 = Math.min(100, w2 + feather) / 100;

          const g = ctx.createLinearGradient(0, 0, targetWidth, targetHeight);
          g.addColorStop(0, config.color1);
          g.addColorStop(f1, config.color1);
          g.addColorStop(f2, config.color2);
          g.addColorStop(f3, config.color2);
          g.addColorStop(f4, config.color3);
          g.addColorStop(1, config.color3);

          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.globalCompositeOperation = 'soft-light';
          ctx.filter = 'blur(48px)';
          ctx.fillStyle = g;
          const padX = targetWidth * 0.08;
          const padY = targetHeight * 0.08;
          ctx.fillRect(-padX, -padY, targetWidth + padX * 2, targetHeight + padY * 2);
          ctx.restore();
        }
      } // End of else block (Sphere/Plane/Water mode)

      // Export
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const quality = format === 'jpg' ? 0.98 : undefined;

      tempCanvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Failed to create image');
          setIsExporting(false);
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `gradient-${targetWidth}x${targetHeight}.${format}`;
        link.href = url;
        link.rel = 'noopener';

        // Some browsers (notably iOS Safari) can ignore download on blob URLs.
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Best-effort fallback for iOS Safari
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }

        setTimeout(() => URL.revokeObjectURL(url), 500);

        toast.success(`Exported ${format.toUpperCase()} (${targetWidth}×${targetHeight})`);
        setIsExporting(false);
      }, mimeType, quality);

    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed');
      setIsExporting(false);
    }
  };

  const handleExportVideo = async () => {
    setIsExporting(true);
    setVideoProgress(0);
    
    try {
      // Find the right canvas - either ShaderGradient canvas or Mesh mode canvas
      const isMeshMode = config?.wireframe === true;
      let canvas: HTMLCanvasElement | null = null;
      
      if (isMeshMode) {
        // Mesh mode uses a separate R3F Canvas
        const allCanvases = document.querySelectorAll('canvas');
        // Find the canvas that's inside the gradient container (not the ShaderGradientCanvas)
        for (const c of allCanvases) {
          const parent = c.closest('.absolute.inset-0');
          if (parent) {
            canvas = c;
            break;
          }
        }
      }
      
      // Fallback to #gradient-stage canvas
      if (!canvas) {
        canvas = document.querySelector('#gradient-stage canvas') as HTMLCanvasElement | null;
      }
      
      if (!canvas) {
        toast.error('Canvas not found');
        setIsExporting(false);
        return;
      }

      // Check for MP4 support
      const mp4Supported = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1');
      const webmVp9Supported = MediaRecorder.isTypeSupported('video/webm;codecs=vp9');
      const webmVp8Supported = MediaRecorder.isTypeSupported('video/webm;codecs=vp8');
      
      let mimeType = 'video/webm';
      let extension = 'webm';
      
      if (mp4Supported) {
        mimeType = 'video/mp4;codecs=avc1';
        extension = 'mp4';
      } else if (webmVp9Supported) {
        mimeType = 'video/webm;codecs=vp9';
        toast.info('Browser does not support MP4, exporting as WebM');
      } else if (webmVp8Supported) {
        mimeType = 'video/webm;codecs=vp8';
        toast.info('Browser does not support MP4, exporting as WebM');
      }

      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8000000,
      });
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gradient-${videoResolution.label}-${videoDuration}s.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success(`Video exported: ${videoResolution.label}, ${videoDuration}s (${extension.toUpperCase()})`);
        setIsExporting(false);
        setVideoProgress(0);
        onClose();
      };

      mediaRecorder.onerror = () => {
        toast.error('Video recording failed');
        setIsExporting(false);
        setVideoProgress(0);
      };

      // Start recording
      mediaRecorder.start();
      
      // Update progress
      const startTime = Date.now();
      recordingIntervalRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min((elapsed / videoDuration) * 100, 100);
        setVideoProgress(progress);
      }, 100);

      // Stop after duration
      recordingTimeoutRef.current = window.setTimeout(() => {
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, videoDuration * 1000);

    } catch (error) {
      console.error('Video export failed:', error);
      toast.error('Video export failed');
      setIsExporting(false);
      setVideoProgress(0);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          />
          <div ref={constraintsRef} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              drag
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={constraintsRef}
              dragMomentum={false}
              className="w-full max-w-lg"
            >
              <div className="glass rounded-2xl mx-auto max-h-[80vh] overflow-y-auto">
                <div
                  className="px-6 pt-4 pb-4 flex items-center justify-between border-b border-border cursor-move select-none sticky top-0 bg-background/80 backdrop-blur-sm z-10"
                  onPointerDown={(e) => dragControls.start(e)}
                >
                  <div>
                    <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border" />
                    <h2 className="font-display text-xl font-semibold text-foreground lowercase">export gradient</h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-secondary/50 transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                <div className="p-6 pb-8">
                  {/* Tab Selection */}
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => setActiveTab('image')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'image'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      <Image className="w-4 h-4" />
                      image
                    </button>
                    <button
                      onClick={() => setActiveTab('video')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'video'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      video
                    </button>
                    <button
                      onClick={() => setActiveTab('css')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'css'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      <Code className="w-4 h-4" />
                      css
                    </button>
                  </div>

                  {activeTab === 'image' ? (
                    <div className="space-y-6">
                      {/* Preview */}
                      {config && (
                        <ExportPreview
                          config={config}
                          width={useCustomSize ? customWidth : selectedSize.width}
                          height={useCustomSize ? customHeight : selectedSize.height}
                          offset={exportOffset}
                          onOffsetChange={setExportOffset}
                        />
                      )}
                      
                      {/* Category Selection */}
                      <div>
                        <label className="text-sm text-muted-foreground mb-3 block lowercase">use case</label>
                        <div className="grid grid-cols-4 gap-2">
                          {(Object.keys(exportCategories) as ExportCategory[]).map((category) => (
                            <button
                              key={category}
                              onClick={() => handleCategoryChange(category)}
                              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-1 lowercase ${
                                selectedCategory === category
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                              }`}
                            >
                              {categoryIcons[category]}
                              {categoryLabels[category].toLowerCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Size Selection */}
                      <div>
                        <label className="text-sm text-muted-foreground mb-3 block lowercase">size</label>
                        <div className="grid grid-cols-2 gap-2">
                          {exportCategories[selectedCategory].map((size) => (
                            <button
                              key={size.label}
                              onClick={() => {
                                setSelectedSize(size);
                                setUseCustomSize(false);
                              }}
                              className={`py-2 px-3 rounded-lg text-sm font-medium transition-all text-left ${
                                !useCustomSize && selectedSize.label === size.label
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                              }`}
                            >
                              <div className="truncate">{size.label}</div>
                              <div className="text-xs opacity-70">{size.width}×{size.height}</div>
                            </button>
                          ))}
                          <button
                            onClick={() => setUseCustomSize(true)}
                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-all text-left lowercase ${
                              useCustomSize
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                            }`}
                          >
                            <div>custom</div>
                            <div className="text-xs opacity-70">any size</div>
                          </button>
                        </div>
                      </div>

                      {/* Custom Size */}
                      {useCustomSize && (
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="text-sm text-muted-foreground mb-2 block lowercase">width</label>
                            <input
                              type="number"
                              value={customWidth}
                              onChange={(e) => setCustomWidth(Number(e.target.value))}
                              className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-sm text-muted-foreground mb-2 block lowercase">height</label>
                            <input
                              type="number"
                              value={customHeight}
                              onChange={(e) => setCustomHeight(Number(e.target.value))}
                              className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {/* Format Selection */}
                      <div>
                        <label className="text-sm text-muted-foreground mb-3 block lowercase">format</label>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setFormat('png')}
                            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                              format === 'png'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                            }`}
                          >
                            <Image className="w-4 h-4" />
                            PNG
                          </button>
                          <button
                            onClick={() => setFormat('jpg')}
                            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                              format === 'jpg'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                            }`}
                          >
                            <FileImage className="w-4 h-4" />
                            JPG
                          </button>
                        </div>
                      </div>

                      {/* Export Button */}
                      <motion.button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="w-full py-4 rounded-full bg-gradient-to-r from-primary via-accent to-gradient-3 text-foreground font-medium text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 lowercase"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <Download className="w-5 h-5" />
                        {isExporting ? 'exporting...' : 'download'}
                      </motion.button>
                    </div>
                  ) : activeTab === 'video' ? (
                    <div className="space-y-6">
                      {/* Preview */}
                      {config && (
                        <ExportPreview
                          config={config}
                          width={videoResolution.width}
                          height={videoResolution.height}
                          offset={exportOffset}
                          onOffsetChange={setExportOffset}
                        />
                      )}
                      
                      {/* Resolution */}
                      <div>
                        <label className="text-sm text-muted-foreground mb-3 block lowercase">resolution</label>
                        <div className="grid grid-cols-3 gap-2">
                          {videoResolutions.map((res) => (
                            <button
                              key={res.label}
                              onClick={() => setVideoResolution(res)}
                              className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                                videoResolution.label === res.label
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                              }`}
                            >
                              {res.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Duration */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm text-muted-foreground lowercase">duration</label>
                          <span className="text-sm text-foreground">{videoDuration}s</span>
                        </div>
                        <Slider
                          value={[videoDuration]}
                          onValueChange={([value]) => setVideoDuration(value)}
                          min={1}
                          max={30}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>1s</span>
                          <span>30s</span>
                        </div>
                      </div>

                      {/* Format Info */}
                      <div className="bg-secondary/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Video className="w-4 h-4" />
                          <span className="lowercase">output: mp4 or webm (depends on browser)</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 lowercase">
                          records the live animation at 30fps. make sure animation is enabled for best results.
                        </p>
                      </div>

                      {/* Progress Bar */}
                      {isExporting && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground lowercase">recording...</span>
                            <span className="text-foreground">{Math.round(videoProgress)}%</span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-primary via-accent to-gradient-3"
                              initial={{ width: 0 }}
                              animate={{ width: `${videoProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Export Button */}
                      <motion.button
                        onClick={handleExportVideo}
                        disabled={isExporting}
                        className="w-full py-4 rounded-full bg-gradient-to-r from-primary via-accent to-gradient-3 text-foreground font-medium text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 lowercase"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        {isExporting ? (
                          <>
                            <div className="w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                            recording...
                          </>
                        ) : (
                          <>
                            <Play className="w-5 h-5" />
                            record video
                          </>
                        )}
                      </motion.button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* CSS Code Preview */}
                      <div className="relative">
                        <pre className="bg-secondary/80 rounded-lg p-4 text-sm text-foreground overflow-x-auto max-h-64 overflow-y-auto">
                          <code>{generateCSSCode()}</code>
                        </pre>
                        <button
                          onClick={handleCopyCSS}
                          className="absolute top-2 right-2 p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>

                      {/* Color Values */}
                      <div>
                        <label className="text-sm text-muted-foreground mb-3 block lowercase">color values</label>
                        <div className="space-y-2">
                          {config && [
                            { color: config.color1, weight: config.colorWeight1 },
                            { color: config.color2, weight: config.colorWeight2 },
                            { color: config.color3, weight: config.colorWeight3 },
                          ].map((item, index) => (
                            <div key={index} className="flex items-center gap-3 bg-secondary/50 rounded-lg p-2">
                              <div 
                                className="w-8 h-8 rounded-md border border-border"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-sm font-mono text-foreground flex-1">{item.color.toUpperCase()}</span>
                              <span className="text-xs text-muted-foreground">{item.weight ?? 33}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Copy Button */}
                      <motion.button
                        onClick={handleCopyCSS}
                        className="w-full py-4 rounded-full bg-gradient-to-r from-primary via-accent to-gradient-3 text-foreground font-medium text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 lowercase"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        {copied ? 'copied!' : 'copy css'}
                      </motion.button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
