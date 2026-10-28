"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/useMediaQuery";
import { ensurePointerTracking, pointer } from "@/hooks/usePointer";
import { isMotionPaused } from "@/hooks/useMotionPaused";
import { getTheme, useTheme } from "@/hooks/useTheme";

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

// Domain-warped fbm "aurora", tinted with the brand accents. The pointer adds
// a soft spotlight and bends the flow; scroll shifts the hue.
// Dark theme: glowing aurora over a dot grid on near-black.
// Light theme: GitHub Universe-style paper (#e9edec) with a fine blueprint
// grid and faint pastel washes that gather around the pointer.
const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform float uScroll;
uniform float uTheme;   // 0 = dark, 1 = light
uniform float uPxScale; // canvas pixels per CSS pixel
out vec4 outColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec2 m = (uPointer - 0.5 * uRes) / uRes.y;
  float t = uTime * 0.045;

  float d = length(p - m);
  vec2 bend = (p - m) * 0.35 * exp(-d * 2.5);

  vec2 q = vec2(fbm(p * 1.4 + t), fbm(p * 1.4 - t + 3.1));
  vec2 r = vec2(fbm(p * 1.6 + 2.0 * q + vec2(1.7, 9.2) + t * 1.3 + bend),
                fbm(p * 1.6 + 2.0 * q + vec2(8.3, 2.8) - t * 1.1));
  float f = fbm(p * 1.2 + 2.4 * r);

  vec3 green  = vec3(0.494, 0.906, 0.529);
  vec3 violet = vec3(0.639, 0.443, 0.969);
  vec3 sky    = vec3(0.475, 0.753, 1.0);
  float hue = 0.5 + 0.5 * sin(uScroll * 2.2 + t * 2.0);
  vec3 tint = mix(mix(green, sky, hue), violet, clamp(r.x * 1.3 - 0.2, 0.0, 1.0));

  if (uTheme > 0.5) {
    vec3 paper = vec3(0.914, 0.929, 0.925);
    vec3 lg = vec3(0.549, 0.949, 0.651);
    vec3 lv = vec3(0.859, 0.749, 0.992);
    vec3 lb = vec3(0.737, 0.925, 1.0);
    vec3 ltint = mix(mix(lg, lb, hue), lv, clamp(r.x * 1.3 - 0.2, 0.0, 1.0));
    float lband = smoothstep(0.5, 1.0, f) * (0.3 + 0.7 * uv.y);
    vec3 col = mix(paper, ltint, lband * 0.32);
    col = mix(col, ltint, 0.28 * exp(-d * 3.0));
    // Blueprint grid: 24px cells in CSS pixels, stronger near the pointer.
    float cell = 24.0 * uPxScale;
    // Distance (in canvas px) to the nearest grid line.
    vec2 gg = abs(fract(gl_FragCoord.xy / cell + 0.5) - 0.5) * cell;
    float grid = 1.0 - smoothstep(0.0, max(0.6, uPxScale), min(gg.x, gg.y));
    col -= vec3(0.02, 0.018, 0.02) * grid * (0.55 + 1.6 * exp(-d * 2.2));
    // A whisper of vignette keeps the edges calm.
    col *= 1.0 - 0.06 * pow(length(uv - 0.5) * 1.3, 2.0);
    outColor = vec4(col, 1.0);
    return;
  }

  // Aurora bands concentrated towards the top of the viewport.
  float band = smoothstep(0.35, 1.0, f) * (0.55 + 0.45 * uv.y);
  vec3 col = vec3(0.027, 0.031, 0.043) + tint * band * 0.22;

  // Pointer spotlight.
  col += tint * 0.10 * exp(-d * 3.2);

  // Dot grid.
  vec2 g = fract(gl_FragCoord.xy / 28.0) - 0.5;
  float dotMask = smoothstep(0.09, 0.0, length(g));
  col += vec3(1.0) * dotMask * 0.035 * (0.4 + band + exp(-d * 2.0));

  // Vignette.
  col *= 1.0 - 0.55 * pow(length(uv - 0.5) * 1.25, 2.0);
  outColor = vec4(col, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

/**
 * Fixed, full-viewport WebGL backdrop. Renders at reduced resolution for
 * performance, pauses when the tab is hidden, and draws a single static frame
 * for reduced-motion users. The "Pause animations" switch freezes the drift
 * (the spotlight still follows the pointer). Falls back to a CSS gradient
 * without WebGL2.
 */
export function ImmersiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const redraw = useRef<(() => void) | null>(null);
  const reduced = usePrefersReducedMotion();
  const theme = useTheme();

  // The animation loop picks the theme up on its next frame; a static
  // (reduced-motion) frame has to be redrawn explicitly.
  useEffect(() => {
    redraw.current?.();
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return;
    ensurePointerTracking();

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uPointer = gl.getUniformLocation(prog, "uPointer");
    const uScroll = gl.getUniformLocation(prog, "uScroll");
    const uTheme = gl.getUniformLocation(prog, "uTheme");
    const uPxScale = gl.getUniformLocation(prog, "uPxScale");

    const scale = Math.min(window.devicePixelRatio, 1.5) * 0.5;
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * scale);
      canvas.height = Math.floor(window.innerHeight * scale);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uPxScale, scale);
    };
    resize();
    window.addEventListener("resize", resize);

    let px = canvas.width * 0.5;
    let py = canvas.height * 0.6;
    let frame = 0;
    let last = performance.now();
    let elapsed = 0;

    const draw = () => {
      // Ease the spotlight towards the pointer (flip Y for GL coordinates).
      const tx = pointer.x * scale;
      const ty = canvas.height - pointer.y * scale;
      px += (tx - px) * 0.06;
      py += (ty - py) * 0.06;
      const scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const now = performance.now();
      if (!isMotionPaused()) elapsed += (now - last) / 1000;
      last = now;
      gl.uniform1f(uTime, reduced ? 12 : elapsed);
      gl.uniform2f(uPointer, px, py);
      gl.uniform1f(uScroll, window.scrollY / scrollMax);
      gl.uniform1f(uTheme, getTheme() === "light" ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    redraw.current = draw;

    const loop = () => {
      draw();
      frame = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !reduced) frame = requestAnimationFrame(loop);
    };

    if (reduced) {
      draw();
      window.addEventListener("resize", draw);
    } else {
      frame = requestAnimationFrame(loop);
      document.addEventListener("visibilitychange", onVisibility);
    }
    canvas.dataset.ready = "true";

    return () => {
      redraw.current = null;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("resize", draw);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, [reduced]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="immersive-fallback absolute inset-0" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-1000 data-[ready=true]:opacity-100"
      />
    </div>
  );
}
