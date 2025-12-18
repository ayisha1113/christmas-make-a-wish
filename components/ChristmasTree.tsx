import React, { useRef, useMemo, useLayoutEffect, useState, useEffect } from 'react';
import { useFrame, extend, ReactThreeFiber } from '@react-three/fiber';
import * as THREE from 'three';
import { AppMode, THEME } from '../types';
import { getRandomSpherePoint, getTreePosition, getRibbonPosition } from '../services/mathUtils';

interface ChristmasTreeProps {
  mode: AppMode;
  gestureRotation: number;
  flashTrigger: number;
}

const COUNT_LEAVES = 4000; 
const COUNT_ORNAMENTS = 1200;
const COUNT_RIBBON = 800;
const EXPLOSION_RADIUS = 15;
// Reduced height and radius by 5% as requested (9.5 * 0.95 = 9.025, 3.325 * 0.95 = 3.158)
const TREE_HEIGHT = 9.025;
const TREE_RADIUS = 3.158;
const TREE_Y_OFFSET = -3.8;

// --- CUSTOM SHADER MATERIAL FOR PARTICLES ---
const ParticleShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uTransition: { value: 0 },
    uGestureRotation: { value: 0 },
    uFlash: { value: 0 },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uTransition;
    uniform float uGestureRotation;
    uniform float uFlash;
    
    attribute vec3 aPositionTree;
    attribute vec3 aPositionExplode;
    attribute float aScale;
    attribute float aRandom;
    
    varying float vDist;
    varying float vRandom;
    varying vec3 vPos;

    mat2 rotate2d(float angle){
        return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    }

    void main() {
      vRandom = aRandom;
      vec3 pos = mix(aPositionTree, aPositionExplode, uTransition);
      float rotAngle = uTime * 0.1 + uGestureRotation * 5.0;
      pos.xz = rotate2d(rotAngle) * pos.xz;
      float breathe = sin(uTime * 1.5 + aRandom * 10.0) * 0.05;
      pos += normalize(pos) * breathe;
      vPos = pos;
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      float size = aScale * 150.0; 
      size *= (1.0 + 0.3 * sin(uTime * 3.0 + aRandom * 100.0));
      size *= (1.0 + uFlash * 1.0);
      gl_PointSize = size * (1.0 / -mvPosition.z);
    }
  `,
  fragmentShader: `
    uniform float uFlash;
    varying float vRandom;
    
    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord) * 2.0;
      if (dist > 1.0) discard;
      float strength = exp(-dist * 2.5);
      strength = pow(strength, 1.2);
      vec3 colorCore = vec3(1.0, 0.1, 0.5); 
      vec3 colorMid = vec3(1.0, 0.5, 0.4);
      vec3 colorEdge = vec3(1.0, 0.8, 0.1);
      vec3 color = mix(colorCore, colorMid, smoothstep(0.0, 0.5, dist));
      color = mix(color, colorEdge, smoothstep(0.5, 1.0, dist));
      color += vec3(uFlash * 2.0);
      gl_FragColor = vec4(color * 4.0, strength);
    }
  `
};

export const ChristmasTree: React.FC<ChristmasTreeProps> = ({ mode, gestureRotation, flashTrigger }) => {
  const ornamentsRef = useRef<THREE.InstancedMesh>(null);
  const ribbonRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const starRef = useRef<THREE.Group>(null);
  const particlesMatRef = useRef<THREE.ShaderMaterial>(null);
  
  const starMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const ribbonMatRef = useRef<THREE.MeshStandardMaterial>(null);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const transitionRef = useRef(0);
  const flashIntensityRef = useRef(0);

  useEffect(() => {
    if (flashTrigger > 0) flashIntensityRef.current = 2.0;
  }, [flashTrigger]);

  const particlesGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const posTree = new Float32Array(COUNT_LEAVES * 3);
    const posExplode = new Float32Array(COUNT_LEAVES * 3);
    const scales = new Float32Array(COUNT_LEAVES);
    const randoms = new Float32Array(COUNT_LEAVES);

    for (let i = 0; i < COUNT_LEAVES; i++) {
      const tPos = getTreePosition(i, COUNT_LEAVES, TREE_RADIUS, TREE_HEIGHT, TREE_Y_OFFSET);
      const ePos = getRandomSpherePoint(EXPLOSION_RADIUS);
      posTree[i*3] = tPos.x;
      posTree[i*3+1] = tPos.y;
      posTree[i*3+2] = tPos.z;
      posExplode[i*3] = ePos.x;
      posExplode[i*3+1] = ePos.y;
      posExplode[i*3+2] = ePos.z;
      scales[i] = Math.random() * 0.5 + 0.3;
      randoms[i] = Math.random();
    }

    geo.setAttribute('position', new THREE.BufferAttribute(posTree, 3));
    geo.setAttribute('aPositionTree', new THREE.BufferAttribute(posTree, 3));
    geo.setAttribute('aPositionExplode', new THREE.BufferAttribute(posExplode, 3));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    return geo;
  }, []);

  const ornamentsData = useMemo(() => {
    return Array.from({ length: COUNT_ORNAMENTS }).map((_, i) => {
      const treePos = getTreePosition(i, COUNT_ORNAMENTS, TREE_RADIUS * 1.1, TREE_HEIGHT, TREE_Y_OFFSET);
      treePos.y += (Math.random() - 0.5); 
      const explodePos = getRandomSpherePoint(EXPLOSION_RADIUS * 1.2);
      return { treePos, explodePos, scale: Math.random() * 0.05 + 0.02 };
    });
  }, []);

  const ribbonData = useMemo(() => {
    return Array.from({ length: COUNT_RIBBON }).map((_, i) => {
      const t = i / COUNT_RIBBON;
      const treePos = getRibbonPosition(t, TREE_RADIUS + 0.2, TREE_HEIGHT, 3.5, TREE_Y_OFFSET);
      const explodePos = getRandomSpherePoint(EXPLOSION_RADIUS * 1.5);
      return { treePos, explodePos, scale: 0.08 };
    });
  }, []);

  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 0.8;
    const innerRadius = 0.35;
    for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI) / points;
        const r = i % 2 === 0 ? outerRadius : innerRadius;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }, []);
  const starExplodePos = useMemo(() => getRandomSpherePoint(EXPLOSION_RADIUS * 0.8), []);
  const starTreePos = useMemo(() => new THREE.Vector3(0, TREE_HEIGHT + TREE_Y_OFFSET + 0.2, 0), []);

  useFrame((state, delta) => {
    const target = mode === AppMode.EXPLODE ? 1 : 0;
    transitionRef.current = THREE.MathUtils.lerp(transitionRef.current, target, delta * 2.5);
    const t = transitionRef.current;
    if (flashIntensityRef.current > 0.01) {
        flashIntensityRef.current = THREE.MathUtils.lerp(flashIntensityRef.current, 0, delta * 3);
    }
    if (particlesMatRef.current) {
        particlesMatRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        particlesMatRef.current.uniforms.uTransition.value = t;
        particlesMatRef.current.uniforms.uGestureRotation.value = gestureRotation;
        particlesMatRef.current.uniforms.uFlash.value = flashIntensityRef.current;
    }
    if (groupRef.current) {
        groupRef.current.rotation.y = (state.clock.elapsedTime * 0.1) + (gestureRotation * 5);
    }
    if (ornamentsRef.current) {
        ornamentsData.forEach((data, i) => {
            dummy.position.lerpVectors(data.treePos, data.explodePos, t);
            dummy.rotation.set(state.clock.elapsedTime + i, state.clock.elapsedTime + i, 0);
            dummy.scale.setScalar(data.scale);
            dummy.updateMatrix();
            ornamentsRef.current!.setMatrixAt(i, dummy.matrix);
        });
        ornamentsRef.current.instanceMatrix.needsUpdate = true;
    }
    if (ribbonRef.current) {
        ribbonData.forEach((data, i) => {
            const explodePos = data.explodePos.clone().multiplyScalar(1.5);
            dummy.position.lerpVectors(data.treePos, explodePos, t);
            dummy.rotation.set(state.clock.elapsedTime * 2 + i, i * 0.1, 0);
            dummy.scale.setScalar(data.scale);
            dummy.updateMatrix();
            ribbonRef.current!.setMatrixAt(i, dummy.matrix);
        });
        ribbonRef.current.instanceMatrix.needsUpdate = true;
        if (ribbonMatRef.current) ribbonMatRef.current.emissiveIntensity = 2 + flashIntensityRef.current;
    }
    if (starRef.current && starMatRef.current) {
        starRef.current.position.lerpVectors(starTreePos, starExplodePos, t);
        starRef.current.rotation.z = state.clock.elapsedTime * 0.5;
        starRef.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.2;
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.1;
        const baseScale = 1 - (t * 0.3); 
        starRef.current.scale.setScalar(pulse * baseScale);
        starMatRef.current.emissiveIntensity = 3 + flashIntensityRef.current * 2;
    }
  });

  useLayoutEffect(() => {
    const ornColor = new THREE.Color(THEME.colors.ornament);
    const tempColor = new THREE.Color();
    if (ornamentsRef.current) {
        for (let i = 0; i < COUNT_ORNAMENTS; i++) {
            tempColor.copy(ornColor).multiplyScalar(0.9 + Math.random() * 0.2);
            ornamentsRef.current.setColorAt(i, tempColor);
        }
        ornamentsRef.current.instanceColor!.needsUpdate = true;
    }
  }, []);

  return (
    <>
      <points geometry={particlesGeometry}>
        <shaderMaterial 
            ref={particlesMatRef}
            args={[ParticleShaderMaterial]}
            transparent={true}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
        />
      </points>
      <group ref={groupRef}>
        <instancedMesh ref={ornamentsRef} args={[undefined, undefined, COUNT_ORNAMENTS]}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial 
            color="#FFD700"
            emissive="#FFD700" 
            emissiveIntensity={0.6}
            roughness={0.2}
            metalness={0.8}
            toneMapped={false}
          />
        </instancedMesh>
        <instancedMesh ref={ribbonRef} args={[undefined, undefined, COUNT_RIBBON]}>
          <tetrahedronGeometry args={[1, 0]} />
          <meshStandardMaterial 
            ref={ribbonMatRef}
            color={THEME.colors.ribbon} 
            emissive={THEME.colors.ribbon}
            emissiveIntensity={2}
            toneMapped={false}
          />
        </instancedMesh>
        <group ref={starRef}>
          <mesh>
            <extrudeGeometry 
              args={[
                starShape, 
                { depth: 0.2, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 }
              ]} 
            />
            <meshStandardMaterial 
              ref={starMatRef}
              color={THEME.colors.star}
              emissive={THEME.colors.star}
              emissiveIntensity={3}
              toneMapped={false}
            />
          </mesh>
          <pointLight intensity={3} color={THEME.colors.star} distance={8} decay={2} />
        </group>
      </group>
    </>
  );
};