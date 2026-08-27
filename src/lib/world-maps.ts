import outdoorColliders from './map-colliders/outdoor.json';
import greenhouseColliders from './map-colliders/greenhouse.json';
import relayColliders from './map-colliders/relay.json';
import workshopColliders from './map-colliders/workshop.json';
import lodgeColliders from './map-colliders/lodge.json';
import cottageColliders from './map-colliders/cottage.json';

export type WorldMapId = 'indoor' | 'outdoor' | 'greenhouse' | 'relay' | 'workshop' | 'lodge' | 'cottage';
export type ColliderRect = {
  id?: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  shape?: string;
  through?: boolean;
};
export type ColliderMap = { floors: ColliderRect[]; obstacles: ColliderRect[] };

export const EDITABLE_MAP_IDS: WorldMapId[] = ['indoor', 'outdoor', 'greenhouse', 'relay', 'workshop', 'lodge', 'cottage'];

export const EXTRA_MAP_COLLIDERS: Partial<Record<WorldMapId, ColliderMap>> = {
  outdoor: outdoorColliders,
  greenhouse: greenhouseColliders,
  relay: relayColliders,
  workshop: workshopColliders,
  lodge: lodgeColliders,
  cottage: cottageColliders,
};

export const MAP_BACKGROUNDS: Record<WorldMapId, string> = {
  indoor: '/game-assets/campus-loop-frames/campus-00.png',
  outdoor: '/game-assets/outdoor-v11-connected-preview.png',
  greenhouse: '/game-assets/greenhouse-interior-v1.png',
  relay: '/game-assets/relay-interior-v1.png',
  workshop: '/game-assets/workshop-interior-v1.png',
  lodge: '/game-assets/lodge-interior-v2.png',
  cottage: '/game-assets/cottage-interior-v1.png',
};
