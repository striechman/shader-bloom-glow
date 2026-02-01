import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, Download, Image, FileImage, Code, Copy, Check, Monitor, Printer, LayoutGrid, Share2, Video, Play, Maximize } from 'lucide-react';
import { useRef, useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { GradientConfig, exportCategories, ExportCategory, aspectRatioValues } from '@/types/gradient';
import { Slider } from '@/components/ui/slider';
import { noise3D, perlinNoise3D, smoothstep, lerp, parseColor, parseColorLinear, linearToSrgb } from '@/lib/noise';
import { captureWebGLCanvasTo2D } from '@/lib/webglCapture';
import { downloadBlob } from '@/lib/download';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: GradientConfig;
}

type ExportTab = 'image' | 'video' | 'css';

const categoryIcons: Record<ExportCategory | 'canvas', React.ReactNode> = {
  canvas: <Maximize className="w-4 h-4" />,
  social: <Share2 className="w-4 h-4" />,
  web: <Monitor className="w-4 h-4" />,
  print: <Printer className="w-4 h-4" />,
  banner: <LayoutGrid className="w-4 h-4" />,
};

const categoryLabels: Record<ExportCategory | 'canvas', string> = {
  canvas: 'Canvas',
  social: 'Social',
  web: 'Web',
  print: 'Print',
  banner: 'Banner',
};

// Map aspect ratios to export resolutions
const aspectRatioExportSizes: Record<string, { label: string; width: number; height: number }[]> = {
  '1:1': [
    { label: 'Small', width: 1080, height: 1080 },
    { label: 'Medium', width: 2048, height: 2048 },
    { label: 'Large', width: 4096, height: 4096 },
  ],
  '16:9': [
    { label: 'HD', width: 1920, height: 1080 },
    { label: '4K', width: 3840, height: 2160 },
  ],
  '9:16': [
    { label: 'Story', width: 1080, height: 1920 },
    { label: 'Large', width: 1440, height: 2560 },
  ],
  '2:3': [
    { label: 'Medium', width: 1200, height: 1800 },
    { label: 'Large', width: 2400, height: 3600 },
  ],
  '3:2': [
    { label: 'Medium', width: 1800, height: 1200 },
    { label: 'Large', width: 3600, height: 2400 },
  ],
  '4:5': [
    { label: 'Instagram', width: 1080, height: 1350 },
    { label: 'Large', width: 2160, height: 2700 },
  ],
  '4:3': [
    { label: 'Medium', width: 1600, height: 1200 },
    { label: 'Large', width: 3200, height: 2400 },
  ],
  '3:4': [
    { label: 'Medium', width: 1200, height: 1600 },
    { label: 'Large', width: 2400, height: 3200 },
  ],
  'hero-banner': [
    { label: 'Standard', width: 1280, height: 400 },
    { label: 'Large', width: 1920, height: 600 },
    { label: 'XL', width: 2560, height: 800 },
  ],
  'small-banner': [
    { label: 'Standard', width: 600, height: 300 },
    { label: 'Medium', width: 900, height: 450 },
    { label: 'Large', width: 1200, height: 600 },
  ],
  'button-large': [
    { label: 'Standard', width: 200, height: 60 },
    { label: '2x', width: 400, height: 120 },
  ],
  'button-medium': [
    { label: 'Standard', width: 150, height: 50 },
    { label: '2x', width: 300, height: 100 },
  ],
  'button-small': [
    { label: 'Standard', width: 100, height: 40 },
    { label: '2x', width: 200, height: 80 },
  ],
  'free': [
    { label: 'HD', width: 1920, height: 1080 },
    { label: '4K', width: 3840, height: 2160 },
  ],
};

const videoResolutions = [
  { label: '720p', width: 1280, height: 720 },
  { label: '1080p', width: 1920, height: 1080 },
  { label: '4K', width: 3840, height: 2160 },
];

// (WebGL capture moved to src/lib/webglCapture.ts)

// ============================================================================
// High-Quality 4-Color Gradient Renderer
// Renders the gradient at target resolution using proven Perlin noise
// ============================================================================
async function render4ColorGradientHighQuality(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: GradientConfig,
  applyHeroBannerFade: boolean = false
): Promise<void> {
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  
  // Parse colors to Linear RGB for correct color mixing (matches WebGL shader)
  const color0 = parseColorLinear(config.color0 ?? '#000000');
  const color1 = parseColorLinear(config.color1 ?? '#FDB515');
  const color2 = parseColorLinear(config.color2 ?? '#EC008C');
  const color3 = parseColorLinear(config.color3 ?? '#6A00F4');
  const color4 = config.color4 ? parseColorLinear(config.color4) : null;
  const hasColor4 = color4 !== null;
  
  // Shader parameters
  const noiseScale = config.meshNoiseScale ?? 1.0;
  const blurFactor = ((config.meshBlur ?? 50) / 100) * 0.5;
  const time = (config.frozenTime ?? 0) * 0.5;
  const freq = Math.max(0.1, config.uFrequency ?? 1);
  const density = Math.max(0, config.uDensity ?? 1);
  const strength = Math.max(0, config.uStrength ?? 0.3);
  const grainEnabled = config.grain;
  const grainIntensity = grainEnabled ? (config.grainIntensity ?? 50) / 100 : 0;
  
  // Color weight thresholds (supports 4 or 5 colors)
  const w0 = (config.colorWeight0 ?? 30) / 100;
  const w1 = (config.colorWeight1 ?? 23) / 100;
  const w2 = (config.colorWeight2 ?? 24) / 100;
  const w3 = (config.colorWeight3 ?? 23) / 100;
  const threshold0 = w0;
  const threshold1 = w0 + w1;
  const threshold2 = w0 + w1 + w2;
  const threshold3 = w0 + w1 + w2 + w3;
  
  // Plane angle in radians
  const planeAngle = (config.planeAngle ?? 45) * Math.PI / 180;
  const planeRadial = config.planeRadial ?? false;
  
  // Conic settings
  const conicStartAngle = (config.conicStartAngle ?? 0) * Math.PI / 180;
  const conicSpiral = (config.conicSpiral ?? 0) / 100;
  const conicOffsetX = (config.conicOffsetX ?? 0) / 100;
  const conicOffsetY = (config.conicOffsetY ?? 0) / 100;
  
  // Diamond settings
  const diamondSharpness = (config.diamondSharpness ?? 50) / 100;
  const diamondOffsetX = (config.diamondOffsetX ?? 0) / 100;
  const diamondOffsetY = (config.diamondOffsetY ?? 0) / 100;
  const diamondRotation = (config.diamondRotation ?? 45) * Math.PI / 180;
  
  // Voronoi settings
  const voronoiScale = config.voronoiScale ?? 5;
  const voronoiRandomness = (config.voronoiRandomness ?? 80) / 100;
  
  // Noise Blend settings
  const noiseBlendScale = config.noiseBlendScale ?? 2;
  const noiseBlendComplexity = config.noiseBlendComplexity ?? 3;
  
  // Gradient type: 0=mesh, 1=sphere, 2=plane, 3=water, 4=conic, 5=noiseBlend, 6=diamond, 7=voronoi
  const gradientType = config.wireframe ? 0 : 
    config.type === 'sphere' ? 1 : 
    config.type === 'plane' ? 2 : 
    config.type === 'waterPlane' ? 3 : 
    config.type === 'conic' ? 4 : 
    config.type === 'noiseBlend' ? 5 :
    config.type === 'diamond' ? 6 :
    config.type === 'voronoi' ? 7 : 0;
  
  // Hero banner fade settings
  const bannerBlackFade = config.bannerBlackFade ?? 30;
  
  // (Debug logs removed)
  
  // Process each pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const v = y / height;
      
      // Center UV for edge distance calculation
      const centeredU = u - 0.5;
      const centeredV = v - 0.5;
      
      // Edge distance (0 at edges, 1 at center) - for corners only in non-banner mode
      const edgeDistX = 1.0 - Math.abs(centeredU) * 2.0;
      const edgeDistY = 1.0 - Math.abs(centeredV) * 2.0;
      const edgeDist = Math.min(edgeDistX, edgeDistY);
      
      // For banners, don't apply edge fade (fill entire rectangle)
      const edgeFade = applyHeroBannerFade ? 1.0 : smoothstep(0.0, 0.3, edgeDist);
      
      let noise: number;
      
      if (gradientType === 0) {
        // MESH MODE: Multi-octave noise for organic blobs
        const noiseX = u * noiseScale * freq;
        const noiseY = v * noiseScale * freq;
        const n1 = noise3D(noiseX, noiseY, time);
        const n2 = noise3D(noiseX * 2 + 100, noiseY * 2 + 100, time) * (0.20 + 0.10 * density);
        const n3 = noise3D(noiseX * 4 + 200, noiseY * 4 + 200, time) * (0.10 + 0.06 * density);
        noise = (n1 + n2 + n3) / 1.375;
        
      } else if (gradientType === 1) {
        // SPHERE MODE: Classic 3D sphere
        const dist = Math.sqrt(centeredU * centeredU + centeredV * centeredV);
        const sphereDist = dist * 1.8;
        const n1 = noise3D(u * 2 * freq, v * 2 * freq, time * 0.2);
        const n2 = noise3D(u * 3 * freq + 50, v * 3 * freq + 50, time * 0.2) * 0.3;
        const sphereGrad = smoothstep(0.0, 1.0, sphereDist);
        const organic = (n1 + n2) * 0.25 * density;
        noise = sphereGrad * 0.7 + organic + 0.15;
        noise = Math.max(0, Math.min(1, noise));
        
      } else if (gradientType === 2) {
        // PLANE MODE: Linear or radial gradient with custom angle
        let baseNoise: number;
        
        if (planeRadial) {
          baseNoise = Math.sqrt(centeredU * centeredU + centeredV * centeredV) * 1.4;
        } else {
          const dirX = Math.cos(planeAngle);
          const dirY = Math.sin(planeAngle);
          baseNoise = centeredU * dirX + centeredV * dirY + 0.5;
        }
        
        // Add subtle noise for organic feel
        const organicNoise = noise3D(u * 2 * freq, v * 2 * freq, time * 0.25) * 0.12 * density;
        const wave = Math.sin(baseNoise * 6.28 + time * 0.4) * 0.06 * strength;
        
        noise = baseNoise + organicNoise + wave;
        noise = Math.max(0, Math.min(1, noise));
        
      } else if (gradientType === 4) {
        // CONIC MODE: Angular gradient with optional spiral
        const offsetCenterU = centeredU - conicOffsetX;
        const offsetCenterV = centeredV - conicOffsetY;
        let angle = Math.atan2(offsetCenterV, offsetCenterU);
        
        // Normalize angle from [-PI, PI] to [0, 1]
        let normalized = (angle + Math.PI) / (2 * Math.PI);
        
        // Apply start angle offset
        normalized = ((normalized + conicStartAngle / (2 * Math.PI)) % 1 + 1) % 1;
        
        // Add spiral effect based on distance from center
        if (conicSpiral > 0.01) {
          const dist = Math.sqrt(offsetCenterU * offsetCenterU + offsetCenterV * offsetCenterV) * 2.0;
          normalized = ((normalized + dist * conicSpiral) % 1 + 1) % 1;
        }
        
        // Add subtle noise for organic feel
        const organicNoise = noise3D(u * 2 * freq, v * 2 * freq, time * 0.2) * 0.05 * density;
        
        noise = normalized + organicNoise;
        noise = Math.max(0, Math.min(1, noise));
        
      } else if (gradientType === 5) {
        // NOISE BLEND MODE: Layered noise for organic transitions
        const scale = noiseBlendScale;
        const complexity = noiseBlendComplexity;
        
        const n1 = noise3D(u * scale * freq, v * scale * freq, time * 0.3);
        const n2 = noise3D(u * scale * 2 * freq + 100, v * scale * 2 * freq + 100, time * 0.3) * 0.25 + 0.25;
        const n3 = noise3D(u * scale * 3 * freq + 200, v * scale * 3 * freq + 200, time * 0.3) * 0.125 + 0.125;
        const n4 = complexity > 2 ? noise3D(u * scale * 4 * freq + 300, v * scale * 4 * freq + 300, time * 0.3) * 0.0625 + 0.0625 : 0;
        const n5 = complexity > 4 ? noise3D(u * scale * 5 * freq + 400, v * scale * 5 * freq + 400, time * 0.3) * 0.03125 + 0.03125 : 0;
        
        noise = (n1 + n2 + n3 + n4 + n5);
        noise = noise / (1.0 + 0.25 + 0.125 + (complexity > 2 ? 0.0625 : 0) + (complexity > 4 ? 0.03125 : 0));
        noise = Math.max(0, Math.min(1, noise));
        
      } else if (gradientType === 6) {
        // DIAMOND MODE: Diamond-shaped gradient from center
        const s = Math.sin(diamondRotation);
        const c = Math.cos(diamondRotation);
        let rotatedU = centeredU * c - centeredV * s;
        let rotatedV = centeredU * s + centeredV * c;
        rotatedU -= diamondOffsetX;
        rotatedV -= diamondOffsetY;
        
        // Diamond distance (Manhattan distance)
        const diamondDist = Math.abs(rotatedU) + Math.abs(rotatedV);
        
        // Apply sharpness
        const sharpness = 0.5 + diamondSharpness * 2.5;
        noise = Math.pow(diamondDist * 1.4, 1.0 / sharpness);
        
        // Add subtle noise for organic feel
        const organicNoise = noise3D(u * 2 * freq, v * 2 * freq, time * 0.2) * 0.05 * density;
        noise = noise + organicNoise;
        noise = Math.max(0, Math.min(1, noise));
        
      } else if (gradientType === 7) {
        // VORONOI MODE: Cell-based pattern
        const scaledU = u * voronoiScale;
        const scaledV = v * voronoiScale;
        const cellIdX = Math.floor(scaledU);
        const cellIdY = Math.floor(scaledV);
        const cellU = scaledU - cellIdX;
        const cellV = scaledV - cellIdY;
        
        let minDist = 1.0;
        
        // Check 3x3 neighborhood
        for (let j = -1; j <= 1; j++) {
          for (let i = -1; i <= 1; i++) {
            const cellPosX = cellIdX + i;
            const cellPosY = cellIdY + j;
            
            // Random point position using hash
            const hash1 = Math.sin(cellPosX * 127.1 + cellPosY * 311.7) * 43758.5453;
            const hash2 = Math.sin(cellPosX * 269.5 + cellPosY * 183.3) * 43758.5453;
            const rx = hash1 - Math.floor(hash1);
            const ry = hash2 - Math.floor(hash2);
            
            // Apply randomness control
            const pointOffsetX = rx * voronoiRandomness + 0.5 * (1 - voronoiRandomness);
            const pointOffsetY = ry * voronoiRandomness + 0.5 * (1 - voronoiRandomness);
            
            // Add time-based animation
            const animOffsetX = 0.1 * Math.sin(time * 0.5 + rx * 6.28);
            const animOffsetY = 0.1 * Math.sin(time * 0.5 + ry * 6.28);
            
            const diffX = i + pointOffsetX + animOffsetX - cellU;
            const diffY = j + pointOffsetY + animOffsetY - cellV;
            const dist = Math.sqrt(diffX * diffX + diffY * diffY);
            
            if (dist < minDist) {
              minDist = dist;
            }
          }
        }
        
        noise = minDist;
        noise = Math.max(0, Math.min(1, noise));
        
      } else {
        // WATER MODE: Smooth flowing liquid
        const n1 = noise3D(u * 1.5 * freq, v * 1.5 * freq, time * 0.15);
        const n2 = noise3D(u * 1.05 * freq + 30, v * 1.05 * freq + 30, time * 0.15) * 0.4 + 0.5;
        const n3 = noise3D(u * 0.75 * freq + 60, v * 0.75 * freq + 60, time * 0.15) * 0.3 + 0.5;
        const wave = Math.sin(u * 4 + v * 3 + time * 0.3) * 0.1;
        const baseNoise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
        noise = baseNoise + wave * density;
        noise = Math.max(0, Math.min(1, noise));
      }
      
      // Apply strength for contrast
      noise = Math.pow(Math.max(0, Math.min(1, noise)), 1.0 + strength * 0.15);
      
      // Color mixing with smooth edges (supports 4 or 5 colors)
      const edge0 = smoothstep(threshold0 - blurFactor, threshold0 + blurFactor, noise);
      const edge1 = smoothstep(threshold1 - blurFactor, threshold1 + blurFactor, noise);
      const edge2 = smoothstep(threshold2 - blurFactor, threshold2 + blurFactor, noise);
      const edge3 = hasColor4 ? smoothstep(threshold3 - blurFactor, threshold3 + blurFactor, noise) : 0;
      
      // Progressive color mixing
      let r = lerp(color0.r, color1.r, edge0);
      let g = lerp(color0.g, color1.g, edge0);
      let b = lerp(color0.b, color1.b, edge0);
      
      r = lerp(r, color2.r, edge1);
      g = lerp(g, color2.g, edge1);
      b = lerp(b, color2.b, edge1);
      
      r = lerp(r, color3.r, edge2);
      g = lerp(g, color3.g, edge2);
      b = lerp(b, color3.b, edge2);
      
      // Apply color4 if it exists
      if (hasColor4 && color4) {
        r = lerp(r, color4.r, edge3);
        g = lerp(g, color4.g, edge3);
        b = lerp(b, color4.b, edge3);
      }
      
      // Apply edge fade - corners blend to color0
      r = lerp(color0.r, r, edgeFade);
      g = lerp(color0.g, g, edgeFade);
      b = lerp(color0.b, b, edgeFade);
      
      // Apply hero banner black fade on left side
      if (applyHeroBannerFade) {
        const fadeStart = bannerBlackFade * 0.5 / 100;
        const fadeEnd = bannerBlackFade / 100;
        
        if (u <= fadeStart) {
          // Full black
          r = 0; g = 0; b = 0;
        } else if (u < fadeEnd) {
          // Fade from black to gradient
          const fadeProgress = (u - fadeStart) / (fadeEnd - fadeStart);
          r = lerp(0, r, fadeProgress);
          g = lerp(0, g, fadeProgress);
          b = lerp(0, b, fadeProgress);
        }
      }
      
      // Convert from Linear RGB back to sRGB for output
      let finalR = linearToSrgb(r);
      let finalG = linearToSrgb(g);
      let finalB = linearToSrgb(b);
      
      // Apply grain if enabled (in sRGB space)
      if (grainIntensity > 0) {
        const grainNoise = perlinNoise3D(u * 220.0, v * 220.0, time * 1.4);
        const grainAmt = (grainNoise * 0.5) * (grainIntensity * 0.18) * 255;
        finalR = Math.round(Math.max(0, Math.min(255, finalR + grainAmt)));
        finalG = Math.round(Math.max(0, Math.min(255, finalG + grainAmt)));
        finalB = Math.round(Math.max(0, Math.min(255, finalB + grainAmt)));
      }
      
      const idx = (y * width + x) * 4;
      data[idx] = finalR;
      data[idx + 1] = finalG;
      data[idx + 2] = finalB;
      data[idx + 3] = 255;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  console.log('[ExportModal] Render complete');
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
  
  // Parse colors to Linear RGB for correct color mixing
  const color0 = parseColorLinear(config.color0 ?? '#000000');
  const color1 = parseColorLinear(config.color1);
  const color2 = parseColorLinear(config.color2);
  const color3 = parseColorLinear(config.color3);
  
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
        
        // Add subtle noise for organic feel (use noise3D with z=0 for 2D)
        const noiseVal = noise3D(u * 3 + time * 0.05, v * 3, 0) * 0.15;
        
        // Create sphere-like falloff with angle variation
        const angle = Math.atan2(dy, dx);
        const angleVar = Math.sin(angle * 2 + time * 0.1) * 0.1;
        
        // Combine distance, angle variation, and noise
        blendValue = dist * 0.7 + angleVar + noiseVal + 0.15;
        blendValue = Math.max(0, Math.min(1, blendValue));
      } else if (config.type === 'plane') {
        // Plane mode: diagonal gradient with subtle noise
        const diagonal = (u + v) / 2;
        const noiseVal = noise3D(u * 2, v * 2 + time * 0.05, 0) * 0.1;
        blendValue = diagonal + noiseVal;
      } else if (config.type === 'waterPlane') {
        // Water mode: wavy gradient
        const wave1 = Math.sin(u * 4 + time * 0.2) * 0.1;
        const wave2 = Math.sin(v * 6 + time * 0.15) * 0.08;
        const noiseVal = noise3D(u * 3, v * 3 + time * 0.1, 0) * 0.15;
        blendValue = (u + v) / 2 + wave1 + wave2 + noiseVal;
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
      
      // Convert from Linear RGB back to sRGB for output
      const idx = (y * width + x) * 4;
      data[idx] = linearToSrgb(r);
      data[idx + 1] = linearToSrgb(g);
      data[idx + 2] = linearToSrgb(b);
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

  const [selectedCategory, setSelectedCategory] = useState<ExportCategory | 'canvas'>('canvas');
  
  // Get canvas sizes based on current aspect ratio
  const canvasSizes = useMemo(() => {
    if (!config) return aspectRatioExportSizes['free'];
    return aspectRatioExportSizes[config.aspectRatio] || aspectRatioExportSizes['free'];
  }, [config?.aspectRatio]);
  
  const [selectedSize, setSelectedSize] = useState(canvasSizes[0]);
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [useCustomSize, setUseCustomSize] = useState(false);
  const [format, setFormat] = useState<'png' | 'jpg'>('png');
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<ExportTab>('image');
  const [copied, setCopied] = useState(false);
  
  // Update selected size when canvas sizes change (aspect ratio changed)
  useEffect(() => {
    if (selectedCategory === 'canvas' && canvasSizes.length > 0) {
      setSelectedSize(canvasSizes[0]);
    }
  }, [canvasSizes, selectedCategory]);
  
  // Video export settings
  const [videoDuration, setVideoDuration] = useState(5);
  const [videoResolution, setVideoResolution] = useState(videoResolutions[1]);
  const [videoProgress, setVideoProgress] = useState(0);

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

  const handleCategoryChange = (category: ExportCategory | 'canvas') => {
    setSelectedCategory(category);
    if (category === 'canvas') {
      setSelectedSize(canvasSizes[0]);
    } else {
      setSelectedSize(exportCategories[category][0]);
    }
    setUseCustomSize(false);
  };

  const generateCSSCode = () => {
    if (!config) return '';
    
    const hasColor4 = config.color4 !== null;
    const w0 = config.colorWeight0 ?? 30;
    const w1 = w0 + (config.colorWeight1 ?? 23);
    const w2 = w1 + (config.colorWeight2 ?? 24);
    const w3 = w2 + (config.colorWeight3 ?? 23);
    const animDuration = Math.round(10 / config.speed);
    
    // Build color stops based on whether color4 is present
    const colorStops = hasColor4 
      ? `    ${config.color0 ?? '#000000'} 0%,
    ${config.color0 ?? '#000000'} ${w0}%,
    ${config.color1} ${w0}%,
    ${config.color1} ${w1}%,
    ${config.color2} ${w1}%,
    ${config.color2} ${w2}%,
    ${config.color3} ${w2}%,
    ${config.color3} ${w3}%,
    ${config.color4} ${w3}%,
    ${config.color4} 100%`
      : `    ${config.color0 ?? '#000000'} 0%,
    ${config.color0 ?? '#000000'} ${w0}%,
    ${config.color1} ${w0}%,
    ${config.color1} ${w1}%,
    ${config.color2} ${w1}%,
    ${config.color2} ${w2}%,
    ${config.color3} ${w2}%,
    ${config.color3} 100%`;
    
    const smoothStops = hasColor4
      ? `    ${config.color0 ?? '#000000'} 0%,
    ${config.color1} 25%,
    ${config.color2} 50%,
    ${config.color3} 75%,
    ${config.color4} 100%`
      : `    ${config.color0 ?? '#000000'} 0%,
    ${config.color1} 33%,
    ${config.color2} 66%,
    ${config.color3} 100%`;
    
    const conicColors = hasColor4
      ? `${config.color0 ?? '#000000'},
    ${config.color1},
    ${config.color2},
    ${config.color3},
    ${config.color4},
    ${config.color0 ?? '#000000'}`
      : `${config.color0 ?? '#000000'},
    ${config.color1},
    ${config.color2},
    ${config.color3},
    ${config.color0 ?? '#000000'}`;
    
    const animatedColors = hasColor4
      ? `${config.color0 ?? '#000000'},
    ${config.color1},
    ${config.color2},
    ${config.color3},
    ${config.color4},
    ${config.color3},
    ${config.color2},
    ${config.color1},
    ${config.color0 ?? '#000000'}`
      : `${config.color0 ?? '#000000'},
    ${config.color1},
    ${config.color2},
    ${config.color3},
    ${config.color2},
    ${config.color1},
    ${config.color0 ?? '#000000'}`;
    
    return `/* Static Gradient (${hasColor4 ? '5' : '4'} colors with ${w0}% base) */
.gradient-background {
  background: linear-gradient(
    135deg,
${colorStops}
  );
}

/* Smooth gradient variant */
.gradient-background-smooth {
  background: linear-gradient(
    135deg,
${smoothStops}
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
    ${conicColors}
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
    ${animatedColors}
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
    ${conicColors}
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

      // Prefer WebGL pixel capture (matches the preview exactly). Fall back to JS render only if capture fails.
      const isHeroBanner = config.aspectRatio === 'hero-banner';
      const gradientStage = document.querySelector('#gradient-stage');
      const sourceCanvas = (gradientStage?.querySelector('canvas') ?? null) as HTMLCanvasElement | null;

      let captured = false;
      if (sourceCanvas) {
        try {
          await captureWebGLCanvasTo2D(sourceCanvas, ctx, targetWidth, targetHeight);
          captured = true;
        } catch {
          captured = false;
        }
      }

      if (!captured) {
        await render4ColorGradientHighQuality(ctx, targetWidth, targetHeight, config, isHeroBanner);
      } else {
        // Heal corner artifacts for WebGL capture
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

         downloadBlob(blob, `gradient-${targetWidth}x${targetHeight}.${format}`);
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
                      {/* Category Selection */}
                      <div>
                        <label className="text-sm text-muted-foreground mb-3 block lowercase">use case</label>
                        <div className="grid grid-cols-5 gap-2">
                          {/* Canvas option first - matches selected aspect ratio */}
                          <button
                            onClick={() => handleCategoryChange('canvas')}
                            className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-1 lowercase ${
                              selectedCategory === 'canvas'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                            }`}
                          >
                            {categoryIcons.canvas}
                            <span className="truncate w-full text-center">
                              {config?.aspectRatio === 'free' ? 'canvas' : config?.aspectRatio || 'canvas'}
                            </span>
                          </button>
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
                          {(selectedCategory === 'canvas' ? canvasSizes : exportCategories[selectedCategory]).map((size) => (
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
