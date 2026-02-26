import { Canvas } from '@react-three/fiber';
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
import { GradientConfig, aspectRatioValues, isHeroBannerRatio, isButtonRatio } from '@/types/gradient';
import { Custom4ColorGradient } from './Custom4ColorGradient';
import { GradientDebugOverlay } from './GradientDebugOverlay';
import { useMemo, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

interface GradientCanvasProps {
  config: GradientConfig;
  onConfigChange?: (updates: Partial<GradientConfig>) => void;
}

export const GradientCanvas = ({ config, onConfigChange }: GradientCanvasProps) => {
  const [showDebug, setShowDebug] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  // Tracks which named handle is being dragged ('center' | 'direction' | 'conicAngle' | null)
  const activeHandle = useRef<string | null>(null);
  
  // Check if dragging is supported
  const isPlaneMode = config.type === 'plane' && !config.wireframe;
  const isGlowMode  = config.type === 'glow';
  const isConicMode = config.type === 'conic';
  const isMeshMode  = config.wireframe; // Mesh, Aura, Silk
  const canDrag = (isPlaneMode || isGlowMode || isConicMode || isMeshMode) && !!onConfigChange;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!canDrag) return;
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [canDrag]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !canDrag || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // nx/ny: -0.5 (left/top) to +0.5 (right/bottom) in screen space
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    const scaleFactor = Math.max(1, (config.planeScale ?? 100) / 100);

    if (isMeshMode) {
      // Mesh: pan the whole gradient canvas via uPlaneOffset
      onConfigChange?.({
        planeOffsetX: Math.max(-50, Math.min(50, Math.round(nx * 100))),
        planeOffsetY: Math.max(-50, Math.min(50, Math.round(ny * 100))),
      });
    } else if (isGlowMode) {
      // Glow: shift orb cluster so its UV-space center follows the cursor.
      // uGlowOffset = (glowOffsetX/100, -glowOffsetY/100) in the shader,
      // so glowOffsetX = nx*100, glowOffsetY = ny*100 keeps st=0.5 at click.
      const gx = Math.round(nx * 100);
      const gy = Math.round(ny * 100);
      onConfigChange?.({
        glowOffsetX: Math.max(-50, Math.min(50, gx)),
        glowOffsetY: Math.max(-50, Math.min(50, gy)),
      });
    } else if (isConicMode) {
      // Conic: move angular center to click position.
      // centeredUv at click = (nx, -ny) [UV Y is flipped vs screen Y].
      // uConicOffset = centeredUv → conicOffsetX = nx*100, conicOffsetY = -ny*100.
      const cx = Math.round(nx * 100);
      const cy = Math.round(-ny * 100);
      onConfigChange?.({
        conicOffsetX: Math.max(-50, Math.min(50, cx)),
        conicOffsetY: Math.max(-50, Math.min(50, cy)),
      });
    } else if (config.planeRadial) {
      // Radial plane: place the radial center exactly at the click position.
      // radialCenter = centeredUv - uPlaneOffset; want 0 at click →
      // uPlaneOffset = centeredUv at click = (nx, -ny).
      const rx = Math.round(nx * 100 * scaleFactor);
      const ry = Math.round(-ny * 100 * scaleFactor);
      onConfigChange?.({
        planeOffsetX: Math.max(-100, Math.min(100, rx)),
        planeOffsetY: Math.max(-100, Math.min(100, ry)),
      });
    } else {
      // Linear plane: pan the gradient so the midpoint follows the cursor.
      // baseNoise = (baseDotNorm - 0.5)/scale + 0.5 + offset;
      // for midpoint (noise=0.5) at cursor: offset = -(nx for X, ny for Y).
      const lx = Math.round(-nx * 100 * scaleFactor);
      const ly = Math.round(ny * 100 * scaleFactor);
      onConfigChange?.({
        planeOffsetX: Math.max(-100, Math.min(100, lx)),
        planeOffsetY: Math.max(-100, Math.min(100, ly)),
      });
    }
  }, [canDrag, onConfigChange, isMeshMode, isGlowMode, isConicMode, config.planeRadial, config.planeScale]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);
  const isButton = isButtonRatio(config.aspectRatio);
  const isFrozen = config.frozenTime !== null;
  const isStaticMode = isButton ? true : (!config.animate || isFrozen);
  const isHeroBanner = isHeroBannerRatio(config.aspectRatio);
  
  // Check if we should use 4-color mode (all custom shader types including water)
  const use4ColorMode = config.type === 'plane' || config.type === 'conic' || config.type === 'glow' || config.type === 'waves' || config.type === 'waterPlane' || config.type === 'noise' || config.type === 'iridescent' || config.wireframe;
  
  // Get current colors based on button preview state
  const currentColors = useMemo(() => {
    if (isButton && config.buttonPreviewState === 'hover') {
      return {
        color1: config.hoverColor1,
        color2: config.hoverColor2,
        color3: config.hoverColor3,
        color4: null, // Buttons don't support color4
        color5: null, // Buttons don't support color5
      };
    }
    return {
      color1: config.color1,
      color2: config.color2,
      color3: config.color3,
      color4: config.color4,
      color5: config.color5,
    };
  }, [isButton, config.buttonPreviewState, config.color1, config.color2, config.color3, config.color4, config.color5, config.hoverColor1, config.hoverColor2, config.hoverColor3]);
  
  // Calculate aspect ratio container styles
  const getContainerStyle = (): React.CSSProperties => {
    if (config.aspectRatio === 'free') {
      return { width: '100%', height: '100%', position: 'relative' };
    }
    
    const ratio = aspectRatioValues[config.aspectRatio];
    if (!ratio) return { width: '100%', height: '100%', position: 'relative' };
    
    if (isButton) {
      const buttonSizes: Record<string, { maxWidth: string; maxHeight: string }> = {
        'button-large': { maxWidth: '240px', maxHeight: '64px' },
        'button-medium': { maxWidth: '180px', maxHeight: '48px' },
        'button-small': { maxWidth: '120px', maxHeight: '40px' },
      };
      const size = buttonSizes[config.aspectRatio] || buttonSizes['button-medium'];
      return {
        width: size.maxWidth,
        height: size.maxHeight,
        position: 'relative' as const,
        borderRadius: '8px',
        overflow: 'hidden',
      };
    }
    
    if (ratio >= 1) {
      return {
        width: `min(100%, calc((100vh - 4rem) * ${ratio}))`,
        height: 'auto',
        aspectRatio: `${ratio}`,
        position: 'relative' as const,
      };
    } else {
      return {
        height: `min(100%, calc((100vw - 4rem) / ${ratio}))`,
        width: 'auto',
        aspectRatio: `${ratio}`,
        position: 'relative' as const,
      };
    }
  };
  
  const grainOpacity = config.grain ? (config.grainIntensity ?? 10) / 10 : 0;

  // ── Control-handle helpers ──────────────────────────────────────────────────
  // Returns the center-handle position as a fraction (0-1) of the container.
  // These are the exact inverses of the drag formulas used in handlePointerMove.
  const getHandleCenter = (): { cx: number; cy: number } => {
    if (isMeshMode) {
      return {
        cx: (config.planeOffsetX ?? 0) / 100 + 0.5,
        cy: (config.planeOffsetY ?? 0) / 100 + 0.5,
      };
    }
    if (isGlowMode) {
      return {
        cx: (config.glowOffsetX ?? 0) / 100 + 0.5,
        cy: (config.glowOffsetY ?? 0) / 100 + 0.5,
      };
    }
    if (isConicMode) {
      return {
        cx: (config.conicOffsetX ?? 0) / 100 + 0.5,
        cy: 0.5 - (config.conicOffsetY ?? 0) / 100,
      };
    }
    if (config.planeRadial) {
      return {
        cx: (config.planeOffsetX ?? 0) / 100 + 0.5,
        cy: 0.5 - (config.planeOffsetY ?? 0) / 100,
      };
    }
    // Linear plane
    return {
      cx: 0.5 - (config.planeOffsetX ?? 0) / 100,
      cy: (config.planeOffsetY ?? 0) / 100 + 0.5,
    };
  };

  // Applies a center-drag offset (same logic as the full-canvas drag handler).
  const applyCenterDrag = useCallback((nx: number, ny: number) => {
    const scaleFactor = Math.max(1, (config.planeScale ?? 100) / 100);
    if (isMeshMode) {
      onConfigChange?.({
        planeOffsetX: Math.max(-50, Math.min(50, Math.round(nx * 100))),
        planeOffsetY: Math.max(-50, Math.min(50, Math.round(ny * 100))),
      });
    } else if (isGlowMode) {
      onConfigChange?.({
        glowOffsetX: Math.max(-50, Math.min(50, Math.round(nx * 100))),
        glowOffsetY: Math.max(-50, Math.min(50, Math.round(ny * 100))),
      });
    } else if (isConicMode) {
      onConfigChange?.({
        conicOffsetX: Math.max(-50, Math.min(50, Math.round(nx * 100))),
        conicOffsetY: Math.max(-50, Math.min(50, Math.round(-ny * 100))),
      });
    } else if (config.planeRadial) {
      onConfigChange?.({
        planeOffsetX: Math.max(-100, Math.min(100, Math.round(nx * 100 * scaleFactor))),
        planeOffsetY: Math.max(-100, Math.min(100, Math.round(-ny * 100 * scaleFactor))),
      });
    } else {
      onConfigChange?.({
        planeOffsetX: Math.max(-100, Math.min(100, Math.round(-nx * 100 * scaleFactor))),
        planeOffsetY: Math.max(-100, Math.min(100, Math.round(ny * 100 * scaleFactor))),
      });
    }
  }, [isMeshMode, isGlowMode, isConicMode, config.planeRadial, config.planeScale, onConfigChange]);
  
  // Create config with current colors for the 4-color gradient
  const gradientConfig = useMemo(() => ({
    ...config,
    color0: config.color0,
    color1: currentColors.color1,
    color2: currentColors.color2,
    color3: currentColors.color3,
    color4: currentColors.color4,
    color5: currentColors.color5,
    animate: isButton ? false : config.animate,
  }), [config, currentColors, isButton]);
  
  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden p-4">
      <div
        ref={containerRef}
        style={getContainerStyle()}
        className="relative flex items-center justify-center"
      >
        {/* Drag overlay – full-canvas coarse positioning (below the handles) */}
        {canDrag && (
          <div
            className="absolute inset-0 z-[35] cursor-crosshair active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        )}

        {/* ── Control handles ── */}
        {canDrag && !isButton && (() => {
          const { cx, cy } = getHandleCenter();
          const hx = Math.max(0.03, Math.min(0.97, cx));
          const hy = Math.max(0.03, Math.min(0.97, cy));

          // Direction / conic handles (linear-plane and conic modes only)
          const HDist = 0.22;
          const showDirHandle   = isPlaneMode && !config.planeRadial;
          const showConicHandle = isConicMode;
          const planeAngleRad   = (config.planeAngle     ?? 45) * Math.PI / 180;
          const conicAngleRad   = (config.conicStartAngle ?? 0) * Math.PI / 180;
          const dirX   = hx + Math.cos(planeAngleRad) * HDist;
          const dirY   = hy - Math.sin(planeAngleRad) * HDist;
          const conicX = hx + Math.cos(conicAngleRad) * HDist;
          const conicY = hy - Math.sin(conicAngleRad) * HDist;

          // ── Per-color orb handles (Mesh + Glow modes) ──────────────────
          // Mirrors the shader's auto-position logic (t=0 snapshot) so handles
          // appear at the actual blob centres before the user pins them.
          const getMeshAutoPositions = (): { x: number; y: number }[] => {
            const style = config.meshStyle ?? 'organic';
            const inward = config.meshCenterInward ?? true;
            if (style === 'flow') {
              const ang = (config.meshFlowAngle ?? 45) * Math.PI / 180;
              const fx = Math.cos(ang); const fy = Math.sin(ang);
              const px = -fy;           const py = fx;
              return [
                { x: 0.5 + fx * 0.28, y: 0.5 + fy * 0.28 },
                { x: 0.5 - fx * 0.28, y: 0.5 - fy * 0.28 },
                { x: 0.5 + px * 0.22, y: 0.5 + py * 0.22 },
                { x: 0.5 - px * 0.22, y: 0.5 - py * 0.22 },
                { x: 0.5 + fx * 0.12, y: 0.5 + fy * 0.12 },
              ];
            }
            if (style === 'center') {
              if (inward) {
                const r = 0.22; const step = 2.39996;
                return [1,2,3,4,5].map(i => ({
                  x: 0.5 + Math.cos(step * i) * r * (1 - (i - 1) * 0.05),
                  y: 0.5 + Math.sin(step * i) * r * (1 - (i - 1) * 0.05),
                }));
              }
              return [
                { x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 },
                { x: 0.8, y: 0.8 }, { x: 0.2, y: 0.8 },
                { x: 0.5, y: 0.5 },
              ];
            }
            // organic
            return [
              { x: 0.25, y: 0.72 }, { x: 0.78, y: 0.30 },
              { x: 0.45, y: 0.18 }, { x: 0.28, y: 0.48 },
              { x: 0.62, y: 0.58 },
            ];
          };

          // Colors and their pinned positions (index 0 = color1)
          const colorEntries: { color: string; posKey: keyof typeof config; idx: number }[] = [
            { color: config.color1, posKey: 'color1Pos', idx: 1 },
            { color: config.color2, posKey: 'color2Pos', idx: 2 },
            { color: config.color3, posKey: 'color3Pos', idx: 3 },
            ...(config.color4 ? [{ color: config.color4, posKey: 'color4Pos' as keyof typeof config, idx: 4 }] : []),
            ...(config.color5 ? [{ color: config.color5, posKey: 'color5Pos' as keyof typeof config, idx: 5 }] : []),
          ];
          const autoPositions = isMeshMode ? getMeshAutoPositions() : [];

          const makeColorHandlePointers = (idx: number, posKey: keyof typeof config) => ({
            onPointerDown: (e: React.PointerEvent) => {
              e.stopPropagation();
              activeHandle.current = `color${idx}`;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            },
            onPointerMove: (e: React.PointerEvent) => {
              if (activeHandle.current !== `color${idx}` || !containerRef.current) return;
              const r = containerRef.current.getBoundingClientRect();
              const x = Math.max(0.01, Math.min(0.99, (e.clientX - r.left) / r.width));
              const y = Math.max(0.01, Math.min(0.99, (e.clientY - r.top) / r.height));
              onConfigChange?.({ [posKey]: { x, y } });
            },
            onPointerUp: () => { activeHandle.current = null; },
            onPointerLeave: () => { activeHandle.current = null; },
          });

          return (
            <>
              {/* SVG connector lines (decorative, no pointer events) */}
              <svg
                className="absolute inset-0 pointer-events-none z-[36]"
                width="100%" height="100%"
                style={{ overflow: 'visible' }}
              >
                {showDirHandle && (
                  <line
                    x1={`${hx * 100}%`} y1={`${hy * 100}%`}
                    x2={`${dirX * 100}%`} y2={`${dirY * 100}%`}
                    stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeDasharray="4 3"
                  />
                )}
                {showConicHandle && (
                  <line
                    x1={`${hx * 100}%`} y1={`${hy * 100}%`}
                    x2={`${conicX * 100}%`} y2={`${conicY * 100}%`}
                    stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeDasharray="4 3"
                  />
                )}
                {/* Lines from center → each color orb (mesh/glow modes) */}
                {(isMeshMode || isGlowMode) && colorEntries.map(({ idx, posKey }, i) => {
                  const pinned = config[posKey] as { x: number; y: number } | null;
                  const pos = pinned ?? autoPositions[i];
                  if (!pos) return null;
                  return (
                    <line key={`line-${idx}`}
                      x1={`${hx * 100}%`} y1={`${hy * 100}%`}
                      x2={`${pos.x * 100}%`} y2={`${pos.y * 100}%`}
                      stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="3 4"
                    />
                  );
                })}
              </svg>

              {/* ── Center handle – pan the whole gradient ── */}
              <div
                className="absolute z-[38] select-none touch-none"
                style={{ left: `${hx * 100}%`, top: `${hy * 100}%`, transform: 'translate(-50%,-50%)' }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  activeHandle.current = 'center';
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (activeHandle.current !== 'center' || !containerRef.current) return;
                  const r = containerRef.current.getBoundingClientRect();
                  applyCenterDrag(
                    (e.clientX - r.left) / r.width - 0.5,
                    (e.clientY - r.top) / r.height - 0.5,
                  );
                }}
                onPointerUp={() => { activeHandle.current = null; }}
                onPointerLeave={() => { activeHandle.current = null; }}
              >
                <div className="w-[24px] h-[24px] rounded-full border-2 border-white/90 bg-white/15 backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.5)] cursor-move flex items-center justify-center">
                  <div className="w-[7px] h-[7px] rounded-full bg-white/95 shadow-sm" />
                </div>
              </div>

              {/* ── Direction handle – rotate linear-plane gradient ── */}
              {showDirHandle && (
                <div
                  className="absolute z-[38] select-none touch-none"
                  style={{ left: `${dirX * 100}%`, top: `${dirY * 100}%`, transform: 'translate(-50%,-50%)' }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    activeHandle.current = 'direction';
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (activeHandle.current !== 'direction' || !containerRef.current) return;
                    const r   = containerRef.current.getBoundingClientRect();
                    const csx = r.left + hx * r.width;
                    const csy = r.top  + hy * r.height;
                    const deg = Math.atan2(-(e.clientY - csy), e.clientX - csx) * 180 / Math.PI;
                    onConfigChange?.({ planeAngle: ((Math.round(deg) % 360) + 360) % 360, planeRadial: false });
                  }}
                  onPointerUp={() => { activeHandle.current = null; }}
                  onPointerLeave={() => { activeHandle.current = null; }}
                >
                  <div className="w-[16px] h-[16px] rounded-full border-2 border-white/90 bg-primary/80 shadow-[0_2px_8px_rgba(0,0,0,0.4)] cursor-alias" />
                </div>
              )}

              {/* ── Conic angle handle ── */}
              {showConicHandle && (
                <div
                  className="absolute z-[38] select-none touch-none"
                  style={{ left: `${conicX * 100}%`, top: `${conicY * 100}%`, transform: 'translate(-50%,-50%)' }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    activeHandle.current = 'conicAngle';
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (activeHandle.current !== 'conicAngle' || !containerRef.current) return;
                    const r   = containerRef.current.getBoundingClientRect();
                    const csx = r.left + hx * r.width;
                    const csy = r.top  + hy * r.height;
                    const deg = Math.atan2(-(e.clientY - csy), e.clientX - csx) * 180 / Math.PI;
                    onConfigChange?.({ conicStartAngle: ((Math.round(deg) % 360) + 360) % 360 });
                  }}
                  onPointerUp={() => { activeHandle.current = null; }}
                  onPointerLeave={() => { activeHandle.current = null; }}
                >
                  <div className="w-[16px] h-[16px] rounded-full border-2 border-white/90 bg-primary/80 shadow-[0_2px_8px_rgba(0,0,0,0.4)] cursor-alias" />
                </div>
              )}

              {/* ── Per-color orb handles (Mesh + Glow modes) ── */}
              {(isMeshMode || isGlowMode) && colorEntries.map(({ color, posKey, idx }, i) => {
                const pinned = config[posKey] as { x: number; y: number } | null;
                const pos    = pinned ?? autoPositions[i];
                if (!pos) return null;
                const px = Math.max(0.02, Math.min(0.98, pos.x));
                const py = Math.max(0.02, Math.min(0.98, pos.y));
                const isPinned = pinned !== null;
                return (
                  <div
                    key={`color-handle-${idx}`}
                    className="absolute z-[37] select-none touch-none group"
                    style={{ left: `${px * 100}%`, top: `${py * 100}%`, transform: 'translate(-50%,-50%)' }}
                    {...makeColorHandlePointers(idx, posKey)}
                  >
                    {/* Colored filled dot */}
                    <div
                      className={`w-[18px] h-[18px] rounded-full border-2 shadow-[0_2px_8px_rgba(0,0,0,0.5)] cursor-move transition-transform group-hover:scale-125 ${
                        isPinned ? 'border-white/90' : 'border-white/50'
                      }`}
                      style={{ backgroundColor: color, opacity: isPinned ? 1 : 0.65 }}
                    />
                    {/* Reset-to-auto button: double-click the handle */}
                    {isPinned && (
                      <div
                        className="absolute inset-0 rounded-full"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          onConfigChange?.({ [posKey]: null });
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </>
          );
        })()}
        
        {use4ColorMode ? (
          /* 4-color gradient for Mesh and Plane modes */
          <Canvas
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              pointerEvents: 'none', // handles + overlay sit above; canvas must not steal events
              borderRadius: isButton ? '9999px' : undefined,
            }}
            camera={{ position: [0, 0, 5], fov: 50 }}
            gl={{ preserveDrawingBuffer: true, alpha: true }}
          >
            <Custom4ColorGradient config={gradientConfig} />
          </Canvas>
        ) : (
          /* Original ShaderGradient for Sphere and Water modes (3 colors) */
          <ShaderGradientCanvas
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              pointerEvents: 'none',
              borderRadius: isButton ? '9999px' : undefined,
            }}
          >
            <ShaderGradient
              type={config.type as 'sphere' | 'plane' | 'waterPlane'}
              animate={isButton ? 'off' : (isStaticMode ? 'off' : 'on')}
              uTime={isFrozen && config.frozenTime !== null ? config.frozenTime : 0}
              uSpeed={config.speed}
              uStrength={config.uStrength}
              uDensity={config.uDensity}
              uFrequency={config.uFrequency}
              color1={currentColors.color1}
              color2={currentColors.color2}
              color3={currentColors.color3}
              wireframe={false}
              grain={isButton ? 'off' : (config.grain ? 'on' : 'off')}
            />
          </ShaderGradientCanvas>
        )}
        
        {/* Hero Banner black fade overlay */}
        {isHeroBanner && (
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background: `linear-gradient(to right,
                rgba(0, 0, 0, 1) 0%,
                rgba(0, 0, 0, 1) ${config.bannerBlackFade * 0.5}%,
                rgba(0, 0, 0, 0) ${config.bannerBlackFade}%
              )`,
            }}
          />
        )}
        
        {/* Button glass effect overlay */}
        {isButton && (
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              borderRadius: '8px',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.1)',
            }}
          />
        )}
        
        {/* Grain overlay for 4-color modes */}
        {use4ColorMode && config.grain && grainOpacity > 0 && (
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              opacity: grainOpacity,
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.35' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
              backgroundSize: '160px 160px',
              mixBlendMode: 'soft-light',
              filter: 'contrast(150%) brightness(110%)',
              borderRadius: isButton ? '9999px' : undefined,
            }}
          />
        )}
      </div>

      {/* Debug UI rendered via portal to avoid z-index/stacking-context and pointer-event issues */}
      {createPortal(
        <div className="pointer-events-none fixed inset-0 z-[1000]">
          <button
            type="button"
            onClick={() => setShowDebug((v) => !v)}
            className="pointer-events-auto fixed bottom-6 left-6 z-[1001] bg-black/80 hover:bg-black/95 text-white text-xs px-4 py-2 rounded-lg font-mono transition-all border border-white/30 shadow-lg hover:shadow-xl"
          >
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </button>

          <div className="pointer-events-auto">
            <GradientDebugOverlay config={config} visible={showDebug} />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};