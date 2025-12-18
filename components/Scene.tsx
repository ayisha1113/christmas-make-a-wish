import React from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { THEME } from '../types';
import { Snow } from './Snow';

interface SceneProps {
  children: React.ReactNode;
}

export const Scene: React.FC<SceneProps> = ({ children }) => {
  return (
    <Canvas
      dpr={[1, 2]} // Optimize pixel ratio
      gl={{ antialias: false, toneMappingExposure: 1.2 }} // Disable default AA for PostProcessing performance
    >
      <PerspectiveCamera makeDefault position={[0, 0, 20]} fov={50} />
      
      {/* --- Environment --- */}
      <color attach="background" args={[THEME.colors.bg]} />
      <fog attach="fog" args={[THEME.colors.bg, 10, 50]} />
      {/* Removed Stars component as requested */}
      
      {/* --- Snow Effect --- */}
      <Snow />
      
      {/* --- Lighting --- */}
      {/* 1. Base Ambient Light: White (not black) to ensure colors are visible */}
      <ambientLight intensity={0.4} color="#ffffff" />
      
      {/* 2. Key Light: Strong White Directional Light for White Specular Highlights */}
      <directionalLight 
        position={[5, 10, 10]} 
        intensity={2.5} 
        color="#ffffff" 
        castShadow={false}
      />

      {/* 3. Fill Light: Soft Pink to blend with theme */}
      <pointLight position={[-10, 0, 10]} intensity={1} color="#ffb6c1" />

      {/* 4. Rim Light: Cool Purple for edge definition */}
      <spotLight 
        position={[0, 10, -10]} 
        intensity={5} 
        color="#4c1d95" 
        angle={1}
        penumbra={1}
      />

      {/* --- Content --- */}
      {children}
      
      {/* --- Controls --- */}
      <OrbitControls 
        enablePan={false} 
        enableZoom={true} 
        minDistance={10} 
        maxDistance={40}
        maxPolarAngle={Math.PI / 1.5}
      />

      {/* --- Post Processing --- */}
      <EffectComposer disableNormalPass>
        <Bloom 
          luminanceThreshold={0.9} 
          mipmapBlur 
          intensity={1.0} 
          radius={0.4}
        />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </Canvas>
  );
};