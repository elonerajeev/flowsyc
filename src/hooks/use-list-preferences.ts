import { useEffect, useMemo, useState } from "react";
import { readStoredJSON, writeStoredJSON } from "@/lib/preferences";

type PreferenceState = {
  order: string[];
  pinned: string[];
};

function readPreferences(key: string): PreferenceState {
  const parsed = readStoredJSON<Partial<PreferenceState>>(key, {});
  return {
    order: Array.isArray(parsed.order) ? parsed.order : [],
    pinned: Array.isArray(parsed.pinned) ? parsed.pinned : [],
  };
}

function normalize(ids: string[], allowed: string[]) {
  return ids.filter((id) => allowed.includes(id));
}

export function useListPreferences<T>(
  storageKey: string,
  items: T[],
  getId: (item: T) => string,
) {
  const [preferences, setPreferences] = useState<PreferenceState>(() => readPreferences(storageKey));

  useEffect(() => {
    setPreferences(readPreferences(storageKey));
  }, [storageKey]);

  useEffect(() => {
    writeStoredJSON(storageKey, preferences);
  }, [preferences, storageKey]);

  const ids = useMemo(() => items.map(getId), [getId, items]);

  const pinned = useMemo(() => normalize(preferences.pinned, ids), [ids, preferences.pinned]);
  const order = useMemo(() => normalize(preferences.order, ids), [ids, preferences.order]);

  const orderedItems = useMemo(() => {
    const pinnedSet = new Set(pinned);
    const orderedSet = new Set(order);
    const pinnedItems = pinned
      .map((id) => items.find((item) => getId(item) === id))
      .filter((item): item is T => Boolean(item));
    const orderedNonPinned = order
      .filter((id) => !pinnedSet.has(id))
      .map((id) => items.find((item) => getId(item) === id))
      .filter((item): item is T => Boolean(item));
    const remaining = items.filter((item) => {
      const id = getId(item);
      return !pinnedSet.has(id) && !orderedSet.has(id);
    });
    return [...pinnedItems, ...orderedNonPinned, ...remaining];
  }, [getId, items, order, pinned]);

  const persist = (next: PreferenceState) => setPreferences(next);

  const move = (fromId: string, toId: string) => {
    if (fromId === toId) return;

    const currentOrder = [...order, ...ids.filter((id) => !order.includes(id) && !pinned.includes(id))];
    const fromIndex = currentOrder.indexOf(fromId);
    const toIndex = currentOrder.indexOf(toId);
    if (fromIndex < 0 || toIndex < 0) return;

    const nextOrder = [...currentOrder];
    const [moved] = nextOrder.splice(fromIndex, 1);
    nextOrder.splice(toIndex, 0, moved);
    persist({ order: nextOrder, pinned });
  };

  const pin = (id: string) => {
    if (pinned.includes(id)) return;
    persist({ order, pinned: [id, ...pinned] });
  };

  const unpin = (id: string) => {
    persist({ order, pinned: pinned.filter((itemId) => itemId !== id) });
  };

  const togglePin = (id: string) => {
    if (pinned.includes(id)) {
      unpin(id);
    } else {
      pin(id);
    }
  };

  return {
    orderedItems,
    pinnedIds: pinned,
    orderIds: order,
    move,
    pin,
    unpin,
    togglePin,
    setOrder: (nextOrder: string[]) => persist({ order: nextOrder, pinned }),
    setPinned: (nextPinned: string[]) => persist({ order, pinned: nextPinned }),
  };
}
