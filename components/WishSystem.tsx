import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Wish } from '../types';

interface WishSystemProps {
  wishes: Wish[];
  onWishComplete: (wish: Wish) => void;
}

const PARTICLES_PER_WISH = 150; 

const WishParticleShader = {
  uniforms: {
    uTime: { value: 0 }
  },
  vertexShader: `
    uniform float uTime;
    attribute float size;
    attribute vec3 color;
    attribute float random;
    varying vec3 vColor;
    varying float vAlpha;
    
    void main() {
      vColor = color;
      vec3 pos = position;
      float angle = uTime * 2.0 + random * 10.0;
      float radius = 0.1 * sin(uTime * 5.0 + random * 20.0);
      pos.x += cos(angle) * radius;
      pos.y += sin(angle) * radius;
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = size * (300.0 / -mvPosition.z); 
      gl_Position = projectionMatrix * mvPosition;
      vAlpha = 0.5 + 0.5 * sin(uTime * 10.0 + random * 100.0);
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vAlpha;
    
    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord) * 2.0;
      if (dist > 1.0) discard;
      float a = 1.0 - dist;
      a = pow(a, 1.5); 
      gl_FragColor = vec4(vColor, a * vAlpha);
    }
  `
};

export const WishSystem: React.FC<WishSystemProps> = ({ wishes, onWishComplete }) => {
  return (
    <>
      {wishes.map((wish) => (
        <SingleWish key={wish.id} wish={wish} onComplete={onWishComplete} />
      ))}
    </>
  );
};

export const FloatingWishes: React.FC<{ wishes: Wish[] }> = ({ wishes }) => {
  return (
    <group>
      {wishes.map((wish) => (
        <FloatingWishItem key={wish.id} text={wish.text} />
      ))}
    </group>
  );
};

const FloatingWishItem = React.memo(({ text }: { text: string }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  const params = useMemo(() => {
    const angle = Math.random() * Math.PI * 2;
    const radius = 6.0 + Math.random() * 4.0; 
    const yBase = -3 + Math.random() * 12; 
    const speed = 0.06 + Math.random() * 0.05; 
    const dir = Math.random() > 0.5 ? 1 : -1;
    return { angle, radius, yBase, speed, dir };
  }, []); 

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const currentAngle = params.angle + t * params.speed * 0.5 * params.dir;
    const y = params.yBase + Math.sin(t * 0.3 + params.angle) * 0.8;
    groupRef.current.position.x = Math.cos(currentAngle) * params.radius;
    groupRef.current.position.z = Math.sin(currentAngle) * params.radius;
    groupRef.current.position.y = y;
  });

  return (
    <group ref={groupRef}>
      <Billboard follow={true}>
        <Html 
          transform 
          distanceFactor={18} // Increased from 10/12 to make text smaller relative to distance
          pointerEvents="none"
          zIndexRange={[0, 0]} 
          style={{ pointerEvents: 'none' }}
        >
          <div 
            className="text-center font-bold px-1 py-0.5"
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: '7px', // Minimalist font size
              lineHeight: '1.1',
              color: '#FFF8DC', 
              textShadow: '0 0 2px #000, 0 0 4px #000',
              width: '90px', 
              backgroundColor: 'transparent',
              wordWrap: 'break-word',
              whiteSpace: 'pre-wrap',
              pointerEvents: 'none',
              userSelect: 'none',
              opacity: 0.85
            }}
          >
            {text}
          </div>
        </Html>
      </Billboard>
    </group>
  );
});

const SingleWish: React.FC<{ wish: Wish; onComplete: (wish: Wish) => void }> = ({ wish, onComplete }) => {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const startTimeRef = useRef<number | null>(null);
  const isCompletedRef = useRef(false);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLES_PER_WISH * 3);
    const colors = new Float32Array(PARTICLES_PER_WISH * 3);
    const sizes = new Float32Array(PARTICLES_PER_WISH);
    const randoms = new Float32Array(PARTICLES_PER_WISH);
    const coreColor = new THREE.Color('#FF1493'); 
    const highlightColor = new THREE.Color('#FFD700'); 
    const glowColor = new THREE.Color('#FFFFFF'); 
    const tempColor = new THREE.Color();

    for (let i = 0; i < PARTICLES_PER_WISH; i++) {
        const r = Math.pow(Math.random(), 0.5) * 0.6; 
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
        const mix = Math.random();
        if (mix < 0.6) tempColor.copy(coreColor);
        else if (mix < 0.9) tempColor.copy(highlightColor);
        else tempColor.copy(glowColor);
        colors[i * 3] = tempColor.r;
        colors[i * 3 + 1] = tempColor.g;
        colors[i * 3 + 2] = tempColor.b;
        sizes[i] = Math.random() * 0.8 + 0.4;
        randoms[i] = Math.random();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('random', new THREE.BufferAttribute(randoms, 1));
    return geo;
  }, []);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  useFrame((state) => {
    if (!groupRef.current || isCompletedRef.current) return;
    if (materialRef.current) materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    if (startTimeRef.current === null) {
        startTimeRef.current = state.clock.elapsedTime;
        return;
    }
    const elapsed = state.clock.elapsedTime - startTimeRef.current;
    const duration = 2.0; 
    let t = elapsed / duration;
    if (t >= 1) {
      t = 1;
      isCompletedRef.current = true;
      groupRef.current.visible = false;
      setTimeout(() => onComplete(wish), 0);
      return;
    }
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const p0 = wish.startPos;
    const p1 = wish.controlPos;
    const p2 = wish.endPos;
    const x = Math.pow(1 - ease, 2) * p0.x + 2 * (1 - ease) * ease * p1.x + Math.pow(ease, 2) * p2.x;
    const y = Math.pow(1 - ease, 2) * p0.y + 2 * (1 - ease) * ease * p1.y + Math.pow(ease, 2) * p2.y;
    const z = Math.pow(1 - ease, 2) * p0.z + 2 * (1 - ease) * ease * p1.z + Math.pow(ease, 2) * p2.z;
    groupRef.current.position.set(x, y, z);
    groupRef.current.rotation.x = state.clock.elapsedTime * 3;
    groupRef.current.rotation.y = state.clock.elapsedTime * 3;
    const scale = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.2;
    groupRef.current.scale.setScalar(scale);
  });

  return (
    <group ref={groupRef} position={wish.startPos}>
      <points geometry={geometry}>
        <shaderMaterial 
          ref={materialRef}
          args={[WishParticleShader]}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <pointLight color="#FF1493" intensity={2} distance={4} decay={2} />
    </group>
  );
};