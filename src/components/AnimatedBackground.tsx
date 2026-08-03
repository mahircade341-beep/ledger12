import { useEffect, useRef } from 'react';

interface OrbState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  originX: number;
  originY: number;
  size: number;
  color: string;
  opacity: number;
}

/**
 * AnimatedBackground — performance-optimized floating gradient orbs.
 *
 * Features:
 *  - Parallax: orbs gently shift toward cursor position
 *  - Optimized: refs instead of React state, ~30fps throttle, CSS transforms
 *  - Spring smooth: exponential smoothing on movement for fluid feel
 */
export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbsRef = useRef<OrbState[]>([]);
  const mouseRef = useRef({ x: 0.5, y: 0.5 }); // normalized 0-1
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const isDark = !document.documentElement.classList.contains('light');

    const colors = isDark
      ? [
          'rgba(16, 185, 129, 0.20)',
          'rgba(45, 212, 191, 0.15)',
          'rgba(96, 165, 250, 0.12)',
          'rgba(16, 185, 129, 0.10)',
          'rgba(52, 211, 153, 0.18)',
        ]
      : [
          'rgba(16, 185, 129, 0.12)',
          'rgba(13, 148, 136, 0.08)',
          'rgba(37, 99, 235, 0.06)',
          'rgba(16, 185, 129, 0.08)',
          'rgba(52, 211, 153, 0.10)',
        ];

    // Create orbs with origin (resting) positions + current (animated) positions
    const orbCount = Math.min(5, Math.max(3, Math.floor(window.innerWidth / 400)));
    const newOrbs: OrbState[] = Array.from({ length: orbCount }, (_, i) => {
      const ox = 10 + Math.random() * 80;
      const oy = 10 + Math.random() * 80;
      return {
        x: ox, y: oy,
        vx: 0, vy: 0,
        originX: ox, originY: oy,
        size: 200 + Math.random() * 350,
        color: colors[i % colors.length],
        opacity: 0.35 + Math.random() * 0.4,
      };
    });
    orbsRef.current = newOrbs;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ── Mouse/touch parallax tracking ──
    const onMouse = (cx: number, cy: number) => {
      mouseRef.current = {
        x: cx / window.innerWidth,
        y: cy / window.innerHeight,
      };
    };

    const handleMouse = (e: MouseEvent) => onMouse(e.clientX, e.clientY);
    const handleTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) onMouse(t.clientX, t.clientY);
    };
    const handleLeave = () => { mouseRef.current = { x: 0.5, y: 0.5 }; };

    window.addEventListener('mousemove', handleMouse, { passive: true });
    window.addEventListener('touchmove', handleTouch, { passive: true });
    window.addEventListener('mouseleave', handleLeave, { passive: true });
    document.addEventListener('touchstart', handleTouch, { passive: true });

    // ── Resize canvas ──
    const resize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // ── Animation loop (throttled ~30fps via dt check) ──
    const animate = (timestamp: number) => {
      // Throttle to ~30fps for battery life
      const dt = timestamp - lastTimeRef.current;
      if (dt < 33) { // ~30fps threshold
        frameRef.current = requestAnimationFrame(animate);
        return;
      }
      lastTimeRef.current = timestamp;

      const { x: mx, y: my } = mouseRef.current;
      const w = canvas!.width;
      const h = canvas!.height;

      ctx!.clearRect(0, 0, w, h);

      for (const orb of orbsRef.current) {
        // Parallax: target position shifts toward mouse from origin
        const parallaxFactor = 6; // max % shift from origin
        const targetX = orb.originX + (mx - 0.5) * parallaxFactor;
        const targetY = orb.originY + (my - 0.5) * parallaxFactor;

        // Spring physics: velocity += (target - pos) * stiffness, apply damping
        const stiffness = 0.008;
        const damping = 0.88;
        orb.vx += (targetX - orb.x) * stiffness;
        orb.vy += (targetY - orb.y) * stiffness;
        orb.vx *= damping;
        orb.vy *= damping;
        orb.x += orb.vx;
        orb.y += orb.vy;

        // Keep within bounds with gentle edge push
        const edgeMargin = 5;
        if (orb.x < -edgeMargin) orb.x = -edgeMargin;
        if (orb.x > 100 + edgeMargin) orb.x = 100 + edgeMargin;
        if (orb.y < -edgeMargin) orb.y = -edgeMargin;
        if (orb.y > 100 + edgeMargin) orb.y = 100 + edgeMargin;

        // Draw the orb as a radial gradient circle
        const cx = (orb.x / 100) * w;
        const cy = (orb.y / 100) * h;
        const r = orb.size;

        const gradient = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r);
        gradient.addColorStop(0, orb.color);
        gradient.addColorStop(1, 'transparent');

        ctx!.beginPath();
        ctx!.arc(cx, cy, r, 0, Math.PI * 2);
        ctx!.fillStyle = gradient;
        ctx!.globalAlpha = orb.opacity;
        ctx!.fill();
      }

      // Subtle vignette
      const vGrad = ctx!.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.8);
      vGrad.addColorStop(0, 'transparent');
      vGrad.addColorStop(1, 'var(--body-bg)');
      ctx!.fillStyle = vGrad;
      ctx!.globalAlpha = 1;
      ctx!.fillRect(0, 0, w, h);

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('touchmove', handleTouch);
      window.removeEventListener('mouseleave', handleLeave);
      document.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ width: '100vw', height: '100vh' }}
      aria-hidden="true"
    />
  );
}
