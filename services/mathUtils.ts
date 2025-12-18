import * as THREE from 'three';

// Helper to generate a random point inside a sphere
export const getRandomSpherePoint = (radius: number): THREE.Vector3 => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius;
  
  const sinPhi = Math.sin(phi);
  const x = r * sinPhi * Math.cos(theta);
  const y = r * sinPhi * Math.sin(theta);
  const z = r * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
};

// Generate positions for a conical tree shape
export const getTreePosition = (
  index: number, 
  total: number, 
  radiusBase: number, 
  height: number,
  yOffset: number = -2
): THREE.Vector3 => {
  // Use golden angle for spiral distribution to avoid straight lines
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const y = (index / total) * height; // Height from 0 to height
  const radiusAtY = radiusBase * (1 - y / height); // Cone shape
  
  const theta = index * goldenAngle;
  
  // Add some noise for "fluffiness"
  const rNoise = (Math.random() - 0.5) * 0.5;
  const finalRadius = Math.max(0, radiusAtY + rNoise);
  
  const x = Math.cos(theta) * finalRadius;
  const z = Math.sin(theta) * finalRadius;
  
  return new THREE.Vector3(x, y + yOffset, z);
};

// Generate positions for the ribbon spiral
export const getRibbonPosition = (
  t: number, // 0 to 1
  radiusBase: number,
  height: number,
  turns: number,
  yOffset: number = -2
): THREE.Vector3 => {
  const angle = t * Math.PI * 2 * turns;
  const y = t * height;
  const r = radiusBase * (1 - t) + 0.2; // Taper to top
  
  const x = Math.cos(angle) * r;
  const z = Math.sin(angle) * r;
  
  return new THREE.Vector3(x, y + yOffset, z);
};
