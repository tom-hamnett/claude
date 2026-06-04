import { useSyncExternalStore } from 'react';

/**
 * Minimal external store used to nudge cloud-mode hooks to refetch — after a
 * local mutation or an incoming realtime change. Local (Dexie) mode ignores it
 * because dexie-react-hooks is already reactive.
 */
let version = 0;
const subscribers = new Set<() => void>();

export function bumpSync(): void {
  version++;
  for (const cb of subscribers) cb();
}

function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

function getSnapshot(): number {
  return version;
}

export function useSyncVersion(): number {
  return useSyncExternalStore(subscribe, getSnapshot);
}
