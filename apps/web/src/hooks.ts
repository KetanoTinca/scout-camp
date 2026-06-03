import { ENTITY_INGREDIENT, LOCALE, type Ingredient } from "@orions-cookbook/core";
import { useEffect, useState } from "react";
import { engine, mirror } from "./runtime.js";

/**
 * Live-reads the ingredient catalog from the local mirror (offline-readable), refreshing
 * on any local or server change. Sorted alphabetically by name for a stable catalog view.
 */
export function useIngredients(): Ingredient[] {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      void mirror.all(ENTITY_INGREDIENT).then((rows) => {
        if (!active) return;
        const list = rows as unknown as Ingredient[];
        setIngredients([...list].sort((a, b) => a.name.localeCompare(b.name, LOCALE)));
      });
    };
    refresh();
    const unsub = engine.subscribe((entity) => {
      if (entity === ENTITY_INGREDIENT) refresh();
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);
  return ingredients;
}

/** Tracks browser connectivity and flushes the outbox when we come back online. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      void engine.flush();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);
  return online;
}

/** Count of writes still waiting to sync (shown as a pending badge). */
export function usePendingCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      void mirror.outbox().then((entries) => {
        if (active) setCount(entries.length);
      });
    };
    refresh();
    const unsub = engine.subscribe(() => refresh());
    const interval = setInterval(refresh, 2000);
    return () => {
      active = false;
      unsub();
      clearInterval(interval);
    };
  }, []);
  return count;
}
