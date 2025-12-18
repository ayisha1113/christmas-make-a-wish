import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SNOW_COUNT = 2000;
const RANGE_Y = 25;
const RANGE_XZ = 25;

export const Snow: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);

  // Initialize particles data
  const [positions, colors, speeds] = useMemo(() => {
    const pos = new Float32Array(SNOW_COUNT * 3);
    const col = new Float32Array(SNOW_COUNT * 3);
    const spd = new Float32Array(SNOW_COUNT);

    const color1 = new THREE.Color('#FFFFFF'); // White
    const color2 = new THREE.Color('#FFF0F5'); // Lavender Blush (Very light pink)
    const tempColor = new THREE.Color();

    for (let i = 0; i < SNOW_COUNT; i++) {
      // Positions: Spread widely across the scene
      pos[i * 3] = (Math.random() - 0.5) * 2 * RANGE_XZ;     // X
      pos[i * 3 + 1] = (Math.random() - 0.5) * 2 * RANGE_Y;  // Y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2 * RANGE_XZ; // Z

      // Colors: Mix between white and light pink
      // 70% chance of pure white, 30% chance of light pink tint
      if (Math.random() > 0.3) {
        tempColor.copy(color1);
      } else {
        tempColor.copy(color2);
      }
      
      col[i * 3] = tempColor.r;
      col[i * 3 + 1] = tempColor.g;
      col[i * 3 + 2] = tempColor.b;

      // Speeds: Random fall speed
      spd[i] = 0.02 + Math.random() * 0.05;
    }

    return [pos, col, spd];
  }, []);

  // Animation Loop
  useFrame(() => {
    if (!pointsRef.current) return;

    const geometry = pointsRef.current.geometry;
    const positionAttribute = geometry.attributes.position as THREE.BufferAttribute;
    
    for (let i = 0; i < SNOW_COUNT; i++) {
      // Update Y position based on speed
      let y = positionAttribute.getY(i);
      y -= speeds[i];

      // Reset if below bottom threshold
      if (y < -RANGE_Y) {
        y = RANGE_Y;
        // Randomize X and Z slightly when respawning to avoid repeating patterns
        const x = (Math.random() - 0.5) * 2 * RANGE_XZ;
        const z = (Math.random() - 0.5) * 2 * RANGE_XZ;
        positionAttribute.setX(i, x);
        positionAttribute.setZ(i, z);
      }

      positionAttribute.setY(i, y);
    }

    positionAttribute.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={SNOW_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={SNOW_COUNT}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </points>
  );
};