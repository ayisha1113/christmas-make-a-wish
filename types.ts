import { Vector3 } from 'three';

export enum AppMode {
  TREE = 'TREE',
  EXPLODE = 'EXPLODE'
}

export interface ParticleData {
  treePos: Vector3;
  explodePos: Vector3;
  rotationSpeed: Vector3;
  scale: number;
}

export interface GestureState {
  isHandDetected: boolean;
  isPinching: boolean; // Tree mode
  isOpen: boolean; // Explode mode
  handPosition: { x: number; y: number }; // Normalized 0-1
  rotationOffset: number;
}

export interface Wish {
  id: string;
  text: string;
  startTime: number;
  startPos: Vector3;
  controlPos: Vector3;
  endPos: Vector3;
}

export const THEME = {
  colors: {
    bg: '#050103',
    leafPrimary: '#FFB6C1', // Light Pink
    leafSecondary: '#FFC0CB', // Pink
    ornament: '#FFD700', // Gold
    ribbon: '#FFFFFF',
    star: '#FFE4E1' // Misty Rose
  }
};