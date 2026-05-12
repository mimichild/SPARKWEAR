import type { PhotoProfile } from '../types';

export interface CompressionProfile {
  width?: number;
  height?: number;
  maxLongEdge?: number;
  quality: number;
}

export const COMPRESSION_PROFILES: Record<PhotoProfile, CompressionProfile> = {
  thumb:         { width: 320,  height: 427,  quality: 0.66 },
  grid:          { width: 720,  height: 960,  quality: 0.76 },
  detail:        { width: 1080, height: 1440, quality: 0.82 },
  'backup-lite': { maxLongEdge: 1600,         quality: 0.86 },
};
