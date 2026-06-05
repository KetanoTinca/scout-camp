import {
  ENTITY_CAMP,
  ENTITY_EXPENSE,
  ENTITY_INGREDIENT,
  ENTITY_MENU_ENTRY,
  ENTITY_RECIPE,
  ENTITY_RECIPE_INGREDIENT,
  ENTITY_SHOP,
  ENTITY_SHOP_PRICE,
  ENTITY_SHOPPING_ITEM,
  LOCALE,
  type Camp,
  type Expense,
  type Ingredient,
  type MenuEntry,
  type Recipe,
  type RecipeIngredient,
  type Shop,
  type ShopPrice,
  type ShoppingItem,
} from "@orions-cookbook/core";
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

/**
 * Live-reads a syncable entity's records from the local mirror, re-reading on any local or
 * server change to that entity. Backs the small list hooks below; the engine notifies per
 * entity so unrelated writes don't churn each list.
 */
function useEntity<T>(entity: string, sort?: (a: T, b: T) => number): T[] {
  const [rows, setRows] = useState<T[]>([]);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      void mirror.all(entity).then((all) => {
        if (!active) return;
        const list = all as unknown as T[];
        setRows(sort ? [...list].sort(sort) : list);
      });
    };
    refresh();
    const unsub = engine.subscribe((changed) => {
      if (changed === entity) refresh();
    });
    return () => {
      active = false;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity]);
  return rows;
}

/** Live list of shops, sorted alphabetically by name. */
export function useShops(): Shop[] {
  return useEntity<Shop>(ENTITY_SHOP, (a, b) => a.name.localeCompare(b.name, LOCALE));
}

/** Live list of every shop price (per ingredient × shop); components filter by ingredient. */
export function useShopPrices(): ShopPrice[] {
  return useEntity<ShopPrice>(ENTITY_SHOP_PRICE);
}

/** Live list of recipes, sorted alphabetically by name for a stable cookbook browse. */
export function useRecipes(): Recipe[] {
  return useEntity<Recipe>(ENTITY_RECIPE, (a, b) => a.name.localeCompare(b.name, LOCALE));
}

/** Live list of every recipe ingredient line; components filter by recipe. */
export function useRecipeIngredients(): RecipeIngredient[] {
  return useEntity<RecipeIngredient>(ENTITY_RECIPE_INGREDIENT);
}

/** Live list of camps, sorted chronologically by start date then name. */
export function useCamps(): Camp[] {
  return useEntity<Camp>(
    ENTITY_CAMP,
    (a, b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name, LOCALE),
  );
}

/** Live list of every menu placement; components filter by camp, day, and slot. */
export function useMenuEntries(): MenuEntry[] {
  return useEntity<MenuEntry>(ENTITY_MENU_ENTRY);
}

/** Live list of every shopping line; components filter by camp. */
export function useShoppingItems(): ShoppingItem[] {
  return useEntity<ShoppingItem>(ENTITY_SHOPPING_ITEM);
}

/** Live list of every expense; components filter by camp. */
export function useExpenses(): Expense[] {
  return useEntity<Expense>(ENTITY_EXPENSE);
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
