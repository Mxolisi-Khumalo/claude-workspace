"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, RoundedBox } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ensurePointerTracking, pointer } from "@/hooks/usePointer";

export type BotMood = "idle" | "listening" | "thinking" | "happy";

const GREEN = new THREE.Color("#7ee787");
const VIOLET = new THREE.Color("#a371f7");
const AMBER = new THREE.Color("#ffa657");

/** Pointer distance (px from the bot's centre) inside which the bot tracks the cursor. */
const TRACK_RADIUS = 520;

interface HeadProps {
  mood: BotMood;
  hostRef: React.RefObject<HTMLDivElement | null>;
  reduced: boolean;
}

function Eye({
  side,
  mood,
  look,
  blink,
  reduced,
}: {
  side: -1 | 1;
  mood: BotMood;
  look: React.RefObject<THREE.Vector2>;
  blink: React.RefObject<number>;
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const pupil = useRef<THREE.Mesh>(null);
  const happy = useRef<THREE.Mesh>(null);
  const pupilMat = useRef<THREE.MeshStandardMaterial>(null);
  const happyMat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state, dt) => {
    if (!group.current || !pupil.current || !happy.current) return;
    const t = state.clock.elapsedTime;
    let lx = look.current.x;
    const ly = look.current.y;
    if (mood === "thinking" && !reduced) lx = Math.sin(t * 3.2) * 0.9; // scanning side to side
    group.current.position.x = THREE.MathUtils.damp(group.current.position.x, side * 0.34 + lx * 0.09, 10, dt);
    group.current.position.y = THREE.MathUtils.damp(group.current.position.y, 0.03 + ly * 0.07, 10, dt);

    const isHappy = mood === "happy";
    pupil.current.visible = !isHappy;
    happy.current.visible = isHappy;
    const open = mood === "listening" ? 1.12 : 1;
    pupil.current.scale.y = THREE.MathUtils.damp(pupil.current.scale.y, open * (1 - blink.current * 0.92), 30, dt);

    const target = mood === "thinking" ? VIOLET : mood === "happy" ? AMBER : GREEN;
    for (const m of [pupilMat.current, happyMat.current]) {
      if (!m) continue;
      m.color.lerp(target, 1 - Math.exp(-6 * dt));
      m.emissive.copy(m.color);
    }
  });

  return (
    <group ref={group} position={[side * 0.36, 0.04, 0.62]}>
      <mesh ref={pupil}>
        <capsuleGeometry args={[0.075, 0.14, 8, 16]} />
        <meshStandardMaterial ref={pupilMat} color={GREEN} emissive={GREEN} emissiveIntensity={1.15} toneMapped={false} />
      </mesh>
      <mesh ref={happy} visible={false}>
        <torusGeometry args={[0.11, 0.035, 12, 32, Math.PI]} />
        <meshStandardMaterial ref={happyMat} color={GREEN} emissive={GREEN} emissiveIntensity={1.15} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Head({ mood, hostRef, reduced }: HeadProps) {
  const root = useRef<THREE.Group>(null);
  const antennaTip = useRef<THREE.Mesh>(null);
  const look = useRef(new THREE.Vector2());
  const blink = useRef(0);
  const nextBlink = useRef(2);
  const tipMat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state, dt) => {
    const g = root.current;
    if (!g) return;
    const t = state.clock.elapsedTime;

    // Where should the bot look? Track the cursor when it is close, else idle.
    let tx = Math.sin(t * 0.5) * 0.35;
    let ty = Math.sin(t * 0.33) * 0.15;
    const host = hostRef.current;
    if (host && pointer.active && !reduced) {
      const r = host.getBoundingClientRect();
      const dx = pointer.x - (r.left + r.width / 2);
      const dy = pointer.y - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy);
      if (dist < TRACK_RADIUS) {
        tx = THREE.MathUtils.clamp(dx / (TRACK_RADIUS * 0.6), -1, 1);
        ty = THREE.MathUtils.clamp(-dy / (TRACK_RADIUS * 0.6), -1, 1);
      }
    }
    if (reduced) {
      tx = 0;
      ty = 0;
    }
    look.current.x = THREE.MathUtils.damp(look.current.x, tx, 6, dt);
    look.current.y = THREE.MathUtils.damp(look.current.y, ty, 6, dt);

    g.rotation.y = look.current.x * 0.45;
    g.rotation.x = -look.current.y * 0.3;
    g.rotation.z = mood === "happy" && !reduced ? Math.sin(t * 9) * 0.06 : THREE.MathUtils.damp(g.rotation.z, 0, 4, dt);
    g.position.y = reduced ? 0 : Math.sin(t * 1.4) * 0.05 + (mood === "happy" ? Math.abs(Math.sin(t * 6)) * 0.08 : 0);

    // Blinking.
    const bt = t - nextBlink.current;
    if (!reduced && bt >= 0) {
      blink.current = bt < 0.08 ? bt / 0.08 : bt < 0.16 ? 1 - (bt - 0.08) / 0.08 : 0;
      if (bt >= 0.16) nextBlink.current = t + 2 + Math.random() * 3.5;
    }

    // Antenna pulses faster while thinking (a steady glow for reduced motion).
    const speed = mood === "thinking" ? 8 : 2;
    const tip = tipMat.current;
    if (tip) {
      tip.emissiveIntensity = reduced ? 1.2 : 1.2 + Math.sin(t * speed) * 0.6;
      const target = mood === "thinking" ? VIOLET : mood === "happy" ? AMBER : GREEN;
      tip.color.lerp(target, 1 - Math.exp(-6 * dt));
      tip.emissive.copy(tip.color);
    }
    if (antennaTip.current) antennaTip.current.scale.setScalar(mood === "listening" ? 1.25 : 1);
  });

  return (
    <group ref={root}>
      {/* Shell */}
      <RoundedBox args={[1.6, 1.25, 1.2]} radius={0.38} smoothness={6}>
        <meshPhysicalMaterial color="#3a4456" metalness={0.25} roughness={0.32} clearcoat={1} clearcoatRoughness={0.12} />
      </RoundedBox>
      {/* Visor */}
      <RoundedBox args={[1.22, 0.72, 0.1]} radius={0.2} smoothness={6} position={[0, 0.02, 0.56]}>
        <meshPhysicalMaterial color="#05070a" metalness={0.1} roughness={0.05} clearcoat={1} />
      </RoundedBox>
      <Eye side={-1} mood={mood} look={look} blink={blink} reduced={reduced} />
      <Eye side={1} mood={mood} look={look} blink={blink} reduced={reduced} />
      {/* Cheeks */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.52, -0.2, 0.6]}>
          <circleGeometry args={[0.06, 24]} />
          <meshBasicMaterial color="#ff7eb6" transparent opacity={mood === "happy" ? 0.85 : 0.35} />
        </mesh>
      ))}
      {/* Ears */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.84, 0, 0]} rotation={[0, 0, (s * Math.PI) / 2]}>
          <mesh>
            <cylinderGeometry args={[0.2, 0.2, 0.14, 32]} />
            <meshStandardMaterial color="#232a36" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, s * -0.075, 0]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.02, 32]} />
            <meshStandardMaterial color="#7ee787" emissive="#7ee787" emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}
      {/* Antenna */}
      <mesh position={[0, 0.78, 0]}>
        <cylinderGeometry args={[0.025, 0.035, 0.32, 12]} />
        <meshStandardMaterial color="#2b3341" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh ref={antennaTip} position={[0, 0.98, 0]}>
        <sphereGeometry args={[0.08, 24, 24]} />
        <meshStandardMaterial ref={tipMat} color={GREEN} emissive={GREEN} emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * Cute 3D concierge bot. Its eyes and head follow the cursor whenever it comes
 * within ~520px; otherwise it idles, blinks and looks around. `mood` drives
 * expressions: listening (wide eyes), thinking (scanning, violet), happy
 * (^ ^ eyes, bounce, amber). Rendering pauses while scrolled off-screen.
 */
export default function BotHead({
  mood = "idle",
  className,
  reduced = false,
}: {
  mood?: BotMood;
  className?: string;
  reduced?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    ensurePointerTracking();
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={hostRef} className={className} aria-hidden>
      <Canvas
        frameloop={visible ? "always" : "never"}
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.2, 5.4], fov: 30 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 4, 5]} intensity={1.4} />
        <pointLight position={[-3, 1, 2]} color="#a371f7" intensity={18} />
        <pointLight position={[3, -1, 2]} color="#7ee787" intensity={10} />
        <Environment resolution={128}>
          <Lightformer intensity={2} position={[0, 3, 4]} scale={[6, 1.5, 1]} />
          <Lightformer intensity={1.2} color="#a371f7" position={[-4, 0, 1]} rotation-y={Math.PI / 2} scale={[3, 3, 1]} />
          <Lightformer intensity={1.2} color="#7ee787" position={[4, 0, 1]} rotation-y={-Math.PI / 2} scale={[3, 3, 1]} />
        </Environment>
        <Head mood={mood} hostRef={hostRef} reduced={reduced} />
        <ContactShadows position={[0, -1.05, 0]} opacity={0.5} scale={4} blur={2.6} far={2} color="#000000" />
      </Canvas>
    </div>
  );
}
