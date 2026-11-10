import { useEffect, type RefObject } from 'react';
import type * as THREE from 'three';

export interface Interactable { id: string; label: string; obj: THREE.Object3D; action: () => void; maxDist: number }
export const registry = new Map<string, Interactable>();

export function useInteractable(id: string, label: string, ref: RefObject<THREE.Object3D | null>, action: () => void, maxDist = 3.2) {
  useEffect(() => {
    if (!ref.current) return;
    registry.set(id, { id, label, obj: ref.current, action, maxDist });
    return () => { registry.delete(id); };
  }, [id, label, ref, action, maxDist]);
}

export function activate(id: string | null) {
  if (!id) return false;
  const it = registry.get(id);
  if (!it) return false;
  it.action();
  return true;
}
