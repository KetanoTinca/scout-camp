import {
  DIMENSIONS,
  ENTITY_CAMP,
  ENTITY_EXPENSE,
  ENTITY_INGREDIENT,
  ENTITY_MENU_ENTRY,
  ENTITY_RECIPE,
  ENTITY_RECIPE_INGREDIENT,
  ENTITY_SHOP,
  ENTITY_SHOP_PRICE,
  ENTITY_SHOPPING_ITEM,
  MEAL_SLOTS,
  RECIPE_CATEGORIES,
  baseUnitForDimension,
  campDays,
  cheapestShop,
  estimateTotal,
  format as formatQuantity,
  formatCurrency,
  fromBase,
  inputUnitsForDimension,
  isLowStock,
  LOCALE,
  priceLine,
  pricePerUnit,
  scaleRecipe,
  shoppingNeeds,
  toBase,
  type Camp,
  type Dimension,
  type Expense,
  type Ingredient,
  type MealSlot,
  type MenuEntry,
  type NeedSource,
  type PriceLine,
  type Recipe,
  type RecipeCategory,
  type RecipeIngredient,
  type Shop,
  type ShopPrice,
  type ShoppingItem,
  type ShoppingSource,
  type SyncOp,
} from "@orions-cookbook/core";
import { useEffect, useState } from "react";
import { clearToken, getToken, login } from "./auth.js";
import {
  useCamps,
  useExpenses,
  useIngredients,
  useMenuEntries,
  useOnlineStatus,
  usePendingCount,
  useRecipeIngredients,
  useRecipes,
  useShopPrices,
  useShoppingItems,
  useShops,
} from "./hooks.js";
import { engine, startSync } from "./runtime.js";

export function App() {
  const [authed, setAuthed] = useState<boolean>(() => getToken() !== null);

  useEffect(() => {
    if (authed) void startSync();
  }, [authed]);

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }
  return (
    <Home
      onLogout={() => {
        engine.stop();
        clearToken();
        setAuthed(false);
      }}
    />
  );
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="card">
      <h1>Orion&rsquo;s Cookbook</h1>
      <p className="muted">Enter the shared password to continue.</p>
      <form onSubmit={submit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Shared password"
          autoFocus
        />
        <button type="submit" disabled={busy || password.length === 0}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </main>
  );
}

const DIMENSION_LABELS: Record<Dimension, string> = {
  MASS: "Mass (g / kg)",
  VOLUME: "Volume (ml / L)",
  COUNT: "Count (pieces)",
};

const RECIPE_CATEGORY_LABELS: Record<RecipeCategory, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
  DESSERT: "Dessert",
};

const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  BREAKFAST: "Breakfast",
  MORNING_SNACK: "Morning snack",
  LUNCH: "Lunch",
  AFTERNOON_SNACK: "Afternoon snack",
  DINNER: "Dinner",
};

const SHOPPING_SOURCE_LABELS: Record<ShoppingSource, string> = {
  auto: "menu",
  manual: "manual",
  restock: "restock",
};

type Tab =
  | "catalog"
  | "inventory"
  | "shops"
  | "prices"
  | "cookbook"
  | "camps"
  | "shopping"
  | "expenses";

/**
 * Authenticated shell: a shared status bar plus tabs over the catalog and its prices —
 * **Catalog** manages what items exist (identity), **Inventory** adjusts how much of each is
 * on hand and its par level, **Shops** maintains the list of shops, and **Prices** records
 * each shop's package offers per ingredient and flags the cheapest. All read live from the
 * offline mirror.
 */
function Home({ onLogout }: { onLogout: () => void }) {
  const ingredients = useIngredients();
  const shops = useShops();
  const shopPrices = useShopPrices();
  const recipes = useRecipes();
  const recipeIngredients = useRecipeIngredients();
  const camps = useCamps();
  const menuEntries = useMenuEntries();
  const shoppingItems = useShoppingItems();
  const expenses = useExpenses();
  const online = useOnlineStatus();
  const pending = usePendingCount();
  const [tab, setTab] = useState<Tab>("catalog");

  const lowCount = ingredients.filter(isLowStock).length;

  return (
    <main className="card">
      <header className="row between">
        <h1>Orion&rsquo;s Cookbook</h1>
        <button className="ghost" onClick={onLogout}>
          Sign out
        </button>
      </header>

      <div className="row status">
        <span className={online ? "pill online" : "pill offline"}>
          {online ? "Online" : "Offline"}
        </span>
        {pending > 0 && <span className="pill pending">{pending} pending</span>}
      </div>

      <nav className="tabs">
        <button
          className={tab === "catalog" ? "tab active" : "tab"}
          onClick={() => setTab("catalog")}
        >
          Catalog
        </button>
        <button
          className={tab === "inventory" ? "tab active" : "tab"}
          onClick={() => setTab("inventory")}
        >
          Inventory
          {lowCount > 0 && <span className="chip low">{lowCount} low</span>}
        </button>
        <button className={tab === "shops" ? "tab active" : "tab"} onClick={() => setTab("shops")}>
          Shops
        </button>
        <button
          className={tab === "prices" ? "tab active" : "tab"}
          onClick={() => setTab("prices")}
        >
          Prices
        </button>
        <button
          className={tab === "cookbook" ? "tab active" : "tab"}
          onClick={() => setTab("cookbook")}
        >
          Cookbook
        </button>
        <button className={tab === "camps" ? "tab active" : "tab"} onClick={() => setTab("camps")}>
          Camps
        </button>
        <button
          className={tab === "shopping" ? "tab active" : "tab"}
          onClick={() => setTab("shopping")}
        >
          Shopping
        </button>
        <button
          className={tab === "expenses" ? "tab active" : "tab"}
          onClick={() => setTab("expenses")}
        >
          Expenses
        </button>
      </nav>

      {tab === "catalog" && <CatalogPanel ingredients={ingredients} />}
      {tab === "inventory" && <InventoryPanel ingredients={ingredients} camps={camps} />}
      {tab === "shops" && <ShopsPanel shops={shops} shopPrices={shopPrices} />}
      {tab === "prices" && (
        <PricesPanel ingredients={ingredients} shops={shops} shopPrices={shopPrices} />
      )}
      {tab === "cookbook" && (
        <CookbookPanel
          recipes={recipes}
          recipeIngredients={recipeIngredients}
          ingredients={ingredients}
        />
      )}
      {tab === "camps" && (
        <CampsPanel
          camps={camps}
          menuEntries={menuEntries}
          recipes={recipes}
          recipeIngredients={recipeIngredients}
          ingredients={ingredients}
        />
      )}
      {tab === "shopping" && (
        <ShoppingPanel
          camps={camps}
          shoppingItems={shoppingItems}
          menuEntries={menuEntries}
          recipes={recipes}
          recipeIngredients={recipeIngredients}
          ingredients={ingredients}
          shops={shops}
          shopPrices={shopPrices}
        />
      )}
      {tab === "expenses" && <ExpensesPanel camps={camps} expenses={expenses} />}
    </main>
  );
}

/** Build the `put` op for an ingredient — its base unit is always derived from dimension. */
function putOp(input: Omit<Ingredient, "baseUnit" | "updatedAt">): SyncOp {
  const now = Date.now();
  const ingredient: Ingredient = {
    ...input,
    baseUnit: baseUnitForDimension(input.dimension),
    updatedAt: now,
  };
  return { entity: ENTITY_INGREDIENT, id: ingredient.id, op: "put", updatedAt: now, payload: ingredient };
}

function CatalogPanel({ ingredients }: { ingredients: Ingredient[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const removeIngredient = async (ingredient: Ingredient) => {
    await engine.enqueue({
      entity: ENTITY_INGREDIENT,
      id: ingredient.id,
      op: "delete",
      updatedAt: Date.now(),
    });
  };

  return (
    <>
      <p className="muted">
        The shared catalog recipes, inventory, and shopping all draw from. Add count-based
        supplies (charcoal, bin bags) here too. Edits sync on reconnect and appear live on
        other devices.
      </p>

      <IngredientForm onSubmit={(input) => engine.enqueue(putOp(input))} />

      <ul className="catalog">
        {ingredients.length === 0 && <li className="muted">No ingredients yet.</li>}
        {ingredients.map((ingredient) =>
          editingId === ingredient.id ? (
            <li key={ingredient.id} className="catalog-item">
              <IngredientForm
                initial={ingredient}
                submitLabel="Save"
                onCancel={() => setEditingId(null)}
                onSubmit={async (input) => {
                  await engine.enqueue(putOp({ ...input, id: ingredient.id }));
                  setEditingId(null);
                }}
              />
            </li>
          ) : (
            <li key={ingredient.id} className="catalog-item row between">
              <div className="ingredient-info">
                <span className="ingredient-name">{ingredient.name}</span>
                <span className="meta">
                  {DIMENSION_LABELS[ingredient.dimension]}
                  {ingredient.category && <span className="chip">{ingredient.category}</span>}
                </span>
                <span className="meta muted">
                  In stock: {formatQuantity(ingredient.stockQty, ingredient.dimension)}
                </span>
              </div>
              <div className="row">
                <button className="ghost small" onClick={() => setEditingId(ingredient.id)}>
                  Edit
                </button>
                <button className="ghost small" onClick={() => void removeIngredient(ingredient)}>
                  Delete
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
    </>
  );
}

/**
 * Inventory view: standing stores at a glance. Each row shows current stock and par level,
 * flags items at or below par as **Low**, and opens an inline editor to adjust both by hand.
 * Adjustments ride the same offline outbox / realtime sync as every other write.
 */
function InventoryPanel({ ingredients, camps }: { ingredients: Ingredient[]; camps: Camp[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <>
      <p className="muted">
        What the group has on hand. Set a par (minimum) level and items at or below it are
        flagged low. Low items can be pushed onto a camp&rsquo;s shopping list as restock.
        Adjustments work offline and sync when you reconnect.
      </p>

      <ul className="catalog">
        {ingredients.length === 0 && (
          <li className="muted">No ingredients yet — add some in the Catalog.</li>
        )}
        {ingredients.map((ingredient) =>
          editingId === ingredient.id ? (
            <li key={ingredient.id} className="catalog-item">
              <StockForm ingredient={ingredient} onDone={() => setEditingId(null)} />
            </li>
          ) : (
            <li key={ingredient.id} className="catalog-item row between">
              <div className="ingredient-info">
                <span className="ingredient-name">
                  {ingredient.name}
                  {isLowStock(ingredient) && <span className="chip low">Low</span>}
                </span>
                <span className="meta muted">
                  Stock: {formatQuantity(ingredient.stockQty, ingredient.dimension)}
                  {" · Par: "}
                  {ingredient.parLevel !== undefined
                    ? formatQuantity(ingredient.parLevel, ingredient.dimension)
                    : "—"}
                </span>
              </div>
              <div className="row">
                {isLowStock(ingredient) && camps.length > 0 && (
                  <RestockControl ingredient={ingredient} camps={camps} />
                )}
                <button className="ghost small" onClick={() => setEditingId(ingredient.id)}>
                  Adjust
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
    </>
  );
}

/**
 * Pushes a low-stock ingredient onto a chosen camp's shopping list as a restock line. The
 * pushed quantity tops the item back up to its par level (`parLevel − stockQty`, in base
 * units). Picking a camp from the dropdown enqueues the restock item immediately.
 */
function RestockControl({ ingredient, camps }: { ingredient: Ingredient; camps: Camp[] }) {
  const toPar = Math.max(0, (ingredient.parLevel ?? 0) - ingredient.stockQty);

  const pushTo = (campId: string) =>
    engine.enqueue(
      shoppingItemPutOp({
        id: crypto.randomUUID(),
        campId,
        ingredientId: ingredient.id,
        source: "restock",
        quantity: toPar,
        updatedAt: Date.now(),
      }),
    );

  return (
    <select
      className="slot-add"
      value=""
      onChange={(e) => {
        if (e.target.value) void pushTo(e.target.value);
      }}
      title="Push onto a camp's shopping list"
    >
      <option value="">Restock →</option>
      {camps.map((camp) => (
        <option key={camp.id} value={camp.id}>
          {camp.name}
        </option>
      ))}
    </select>
  );
}

/** The new fields a catalog entry needs; id/stockQty/parLevel are carried by the caller. */
type IngredientInput = Omit<Ingredient, "baseUnit" | "updatedAt">;

/**
 * Shared add/edit form for catalog identity (name, dimension, category). In "add" mode it
 * mints a new id with zero stock and no par; in "edit" mode it preserves the existing id,
 * stock, and par untouched. `baseUnit` is never entered — the caller's `putOp` derives it.
 */
function IngredientForm({
  initial,
  submitLabel = "Add ingredient",
  onSubmit,
  onCancel,
}: {
  initial?: Ingredient;
  submitLabel?: string;
  onSubmit: (input: IngredientInput) => void | Promise<void>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [dimension, setDimension] = useState<Dimension>(initial?.dimension ?? "MASS");
  const [category, setCategory] = useState(initial?.category ?? "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await onSubmit({
      id: initial?.id ?? crypto.randomUUID(),
      name: trimmed,
      dimension,
      category: category.trim() || undefined,
      stockQty: initial?.stockQty ?? 0,
      parLevel: initial?.parLevel,
    });
    if (!initial) {
      setName("");
      setCategory("");
      setDimension("MASS");
    }
  };

  return (
    <form onSubmit={submit} className="add-form">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ingredient name…"
        autoFocus={!initial}
      />
      <div className="row">
        <select value={dimension} onChange={(e) => setDimension(e.target.value as Dimension)}>
          {DIMENSIONS.map((d) => (
            <option key={d} value={d}>
              {DIMENSION_LABELS[d]}
            </option>
          ))}
        </select>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category (optional)"
        />
      </div>
      <div className="row">
        <button type="submit" disabled={name.trim().length === 0}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

/** Build a `put` op that updates only stock and par on an existing ingredient. */
function stockPutOp(ing: Ingredient, stockQty: number, parLevel: number | undefined): SyncOp {
  const now = Date.now();
  const updated: Ingredient = {
    ...ing,
    stockQty,
    parLevel,
    baseUnit: baseUnitForDimension(ing.dimension),
    updatedAt: now,
  };
  return { entity: ENTITY_INGREDIENT, id: ing.id, op: "put", updatedAt: now, payload: updated };
}

/**
 * Inline editor for one ingredient's stock and par level. Each is a magnitude plus a unit
 * the dimension allows (g/kg, ml/L, pieces); values are converted to base units via the
 * `units` module on save. An empty par field means "no par" (clears low-stock flagging).
 */
function StockForm({ ingredient, onDone }: { ingredient: Ingredient; onDone: () => void }) {
  const dimension = ingredient.dimension;
  const units = inputUnitsForDimension(dimension);

  const stockDisplay = fromBase(ingredient.stockQty, dimension);
  const [stockValue, setStockValue] = useState(String(stockDisplay.value));
  const [stockUnit, setStockUnit] = useState<string>(stockDisplay.unit);

  const parDisplay = ingredient.parLevel !== undefined ? fromBase(ingredient.parLevel, dimension) : null;
  const [parValue, setParValue] = useState(parDisplay ? String(parDisplay.value) : "");
  const [parUnit, setParUnit] = useState<string>(parDisplay ? parDisplay.unit : units[0]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const stockNum = Number(stockValue);
    const stockQty = Number.isFinite(stockNum) && stockNum > 0 ? toBase(stockNum, stockUnit) : 0;

    const parTrimmed = parValue.trim();
    const parNum = Number(parTrimmed);
    const parLevel =
      parTrimmed === "" || !Number.isFinite(parNum) || parNum < 0
        ? undefined
        : toBase(parNum, parUnit);

    await engine.enqueue(stockPutOp(ingredient, stockQty, parLevel));
    onDone();
  };

  return (
    <form onSubmit={save} className="add-form">
      <span className="ingredient-name">{ingredient.name}</span>
      <label className="field">
        <span className="field-label">In stock</span>
        <div className="row">
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={stockValue}
            onChange={(e) => setStockValue(e.target.value)}
            autoFocus
          />
          <UnitSelect units={units} value={stockUnit} onChange={setStockUnit} />
        </div>
      </label>
      <label className="field">
        <span className="field-label">Par level (optional)</span>
        <div className="row">
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={parValue}
            onChange={(e) => setParValue(e.target.value)}
            placeholder="No par"
          />
          <UnitSelect units={units} value={parUnit} onChange={setParUnit} />
        </div>
      </label>
      <div className="row">
        <button type="submit">Save</button>
        <button type="button" className="ghost" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/** A unit picker; collapses to a static label when the dimension allows only one unit. */
function UnitSelect({
  units,
  value,
  onChange,
}: {
  units: readonly string[];
  value: string;
  onChange: (unit: string) => void;
}) {
  if (units.length === 1) {
    return <span className="unit-fixed">{units[0]}</span>;
  }
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {units.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </select>
  );
}

/** Build a `put` op for a shop. */
function shopPutOp(id: string, name: string): SyncOp {
  const now = Date.now();
  const shop: Shop = { id, name, updatedAt: now };
  return { entity: ENTITY_SHOP, id, op: "put", updatedAt: now, payload: shop };
}

/** Build a `put` op for a per-shop ingredient price. */
function shopPricePutOp(
  id: string,
  ingredientId: string,
  shopId: string,
  packageSize: number,
  packagePrice: number,
): SyncOp {
  const now = Date.now();
  const price: ShopPrice = { id, ingredientId, shopId, packageSize, packagePrice, updatedAt: now };
  return { entity: ENTITY_SHOP_PRICE, id, op: "put", updatedAt: now, payload: price };
}

/** The readable unit price is shown per kg / L / piece, not per raw base unit (per g/ml). */
function priceUnitLabel(dimension: Dimension): { factor: number; unit: string } {
  switch (dimension) {
    case "MASS":
      return { factor: 1000, unit: "kg" };
    case "VOLUME":
      return { factor: 1000, unit: "L" };
    case "COUNT":
      return { factor: 1, unit: "piece" };
  }
}

/** Format a per-base-unit price (RON/g, RON/ml, RON/piece) as the readable RON/kg, /L, /piece. */
function formatPricePerUnit(perBaseUnit: number, dimension: Dimension): string {
  const { factor, unit } = priceUnitLabel(dimension);
  return `${formatCurrency(perBaseUnit * factor)}/${unit}`;
}

/**
 * Shops view: the list of shops the group buys at. Add, rename, and remove shops; deleting a
 * shop also clears its recorded prices so no ingredient flags a vanished shop as cheapest.
 * Every edit rides the same offline outbox / realtime sync as the rest of the app.
 */
function ShopsPanel({ shops, shopPrices }: { shops: Shop[]; shopPrices: ShopPrice[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const removeShop = async (shop: Shop) => {
    // Drop the shop, then its orphaned price rows (a single offline writer, so order is safe).
    await engine.enqueue({ entity: ENTITY_SHOP, id: shop.id, op: "delete", updatedAt: Date.now() });
    for (const price of shopPrices.filter((p) => p.shopId === shop.id)) {
      await engine.enqueue({
        entity: ENTITY_SHOP_PRICE,
        id: price.id,
        op: "delete",
        updatedAt: Date.now(),
      });
    }
  };

  return (
    <>
      <p className="muted">
        Where you buy things. Record each shop&rsquo;s package size and price per ingredient on
        the Prices tab to compare offers.
      </p>

      <ShopForm onSubmit={(name) => engine.enqueue(shopPutOp(crypto.randomUUID(), name))} />

      <ul className="catalog">
        {shops.length === 0 && <li className="muted">No shops yet.</li>}
        {shops.map((shop) =>
          editingId === shop.id ? (
            <li key={shop.id} className="catalog-item">
              <ShopForm
                initial={shop}
                submitLabel="Save"
                onCancel={() => setEditingId(null)}
                onSubmit={async (name) => {
                  await engine.enqueue(shopPutOp(shop.id, name));
                  setEditingId(null);
                }}
              />
            </li>
          ) : (
            <li key={shop.id} className="catalog-item row between">
              <span className="ingredient-name">{shop.name}</span>
              <div className="row">
                <button className="ghost small" onClick={() => setEditingId(shop.id)}>
                  Edit
                </button>
                <button className="ghost small" onClick={() => void removeShop(shop)}>
                  Delete
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
    </>
  );
}

/** Add/edit form for a shop name. */
function ShopForm({
  initial,
  submitLabel = "Add shop",
  onSubmit,
  onCancel,
}: {
  initial?: Shop;
  submitLabel?: string;
  onSubmit: (name: string) => void | Promise<void>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await onSubmit(trimmed);
    if (!initial) setName("");
  };

  return (
    <form onSubmit={submit} className="add-form">
      <div className="row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Shop name…"
          autoFocus={!initial}
        />
        <button type="submit" disabled={name.trim().length === 0}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

/**
 * Prices view: per ingredient, the cheapest shop and its unit price at a glance, with an inline
 * editor to record each shop's package size and price. Price-per-unit and the cheapest shop come
 * from the pure `pricing` module so the same rule the shopping list uses decides "cheapest" here.
 */
function PricesPanel({
  ingredients,
  shops,
  shopPrices,
}: {
  ingredients: Ingredient[];
  shops: Shop[];
  shopPrices: ShopPrice[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (ingredients.length === 0) {
    return <p className="muted">No ingredients yet — add some in the Catalog.</p>;
  }
  if (shops.length === 0) {
    return <p className="muted">No shops yet — add some in the Shops tab to record prices.</p>;
  }

  return (
    <>
      <p className="muted">
        Record each shop&rsquo;s package size and price for an ingredient; the cheapest shop by
        price-per-unit is flagged. Edits sync on reconnect and appear live on other devices.
      </p>

      <ul className="catalog">
        {ingredients.map((ingredient) => {
          const prices = shopPrices.filter((p) => p.ingredientId === ingredient.id);
          // Only consider prices at shops that still exist when choosing the cheapest.
          const valid = prices.filter((p) => shops.some((s) => s.id === p.shopId));
          const best = cheapestShop(valid);
          const bestShop = best && shops.find((s) => s.id === best.shopId);

          if (editingId === ingredient.id) {
            return (
              <li key={ingredient.id} className="catalog-item">
                <IngredientPriceEditor
                  ingredient={ingredient}
                  shops={shops}
                  prices={prices}
                  onDone={() => setEditingId(null)}
                />
              </li>
            );
          }
          return (
            <li key={ingredient.id} className="catalog-item row between">
              <div className="ingredient-info">
                <span className="ingredient-name">{ingredient.name}</span>
                {best && bestShop ? (
                  <span className="meta muted">
                    {formatPricePerUnit(pricePerUnit(best), ingredient.dimension)} ·{" "}
                    <span className="chip">{bestShop.name}</span>
                    {valid.length > 1 && ` · ${valid.length} shops`}
                  </span>
                ) : (
                  <span className="meta muted">No prices yet</span>
                )}
              </div>
              <button className="ghost small" onClick={() => setEditingId(ingredient.id)}>
                Prices
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Per-shop draft inputs for one ingredient's prices. */
interface PriceDraft {
  size: string;
  unit: string;
  price: string;
}

/**
 * Inline editor for one ingredient's per-shop prices: a row per shop with a package size (in a
 * unit the dimension allows) and a package price in RON. Each row shows its live price-per-unit
 * and the cheapest row is flagged. On save, filled rows are upserted and emptied rows deleted.
 */
function IngredientPriceEditor({
  ingredient,
  shops,
  prices,
  onDone,
}: {
  ingredient: Ingredient;
  shops: Shop[];
  prices: ShopPrice[];
  onDone: () => void;
}) {
  const dimension = ingredient.dimension;
  const units = inputUnitsForDimension(dimension);
  const emptyDraft = (): PriceDraft => ({ size: "", unit: units[0], price: "" });

  const [drafts, setDrafts] = useState<Record<string, PriceDraft>>(() => {
    const initial: Record<string, PriceDraft> = {};
    for (const shop of shops) {
      const existing = prices.find((p) => p.shopId === shop.id);
      const display = existing ? fromBase(existing.packageSize, dimension) : null;
      initial[shop.id] = {
        size: display ? String(display.value) : "",
        unit: display ? display.unit : units[0],
        price: existing ? String(existing.packagePrice) : "",
      };
    }
    return initial;
  });

  const draftFor = (shopId: string): PriceDraft => drafts[shopId] ?? emptyDraft();

  const update = (shopId: string, patch: Partial<PriceDraft>) =>
    setDrafts((prev) => ({ ...prev, [shopId]: { ...(prev[shopId] ?? emptyDraft()), ...patch } }));

  /** Live per-base-unit price for a row, or null when it isn't fully/validly filled. */
  const rowPerUnit = (draft: PriceDraft): number | null => {
    const size = Number(draft.size);
    const price = Number(draft.price);
    if (draft.size.trim() === "" || !Number.isFinite(size) || size <= 0) return null;
    if (draft.price.trim() === "" || !Number.isFinite(price) || price < 0) return null;
    return pricePerUnit({ packageSize: toBase(size, draft.unit), packagePrice: price });
  };

  // Which shop is currently cheapest among the live drafts (for the inline flag).
  let cheapestShopId: string | null = null;
  let cheapestPpu = Infinity;
  for (const shop of shops) {
    const ppu = rowPerUnit(draftFor(shop.id));
    if (ppu !== null && ppu < cheapestPpu) {
      cheapestPpu = ppu;
      cheapestShopId = shop.id;
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const shop of shops) {
      const draft = draftFor(shop.id);
      const existing = prices.find((p) => p.shopId === shop.id);
      const size = Number(draft.size);
      const price = Number(draft.price);
      const filled =
        draft.size.trim() !== "" &&
        Number.isFinite(size) &&
        size > 0 &&
        draft.price.trim() !== "" &&
        Number.isFinite(price) &&
        price >= 0;

      if (filled) {
        await engine.enqueue(
          shopPricePutOp(
            existing?.id ?? crypto.randomUUID(),
            ingredient.id,
            shop.id,
            toBase(size, draft.unit),
            price,
          ),
        );
      } else if (existing) {
        await engine.enqueue({
          entity: ENTITY_SHOP_PRICE,
          id: existing.id,
          op: "delete",
          updatedAt: Date.now(),
        });
      }
    }
    onDone();
  };

  return (
    <form onSubmit={save} className="add-form">
      <span className="ingredient-name">{ingredient.name}</span>
      <div className="price-rows">
        {shops.map((shop) => {
          const draft = draftFor(shop.id);
          const ppu = rowPerUnit(draft);
          return (
            <div key={shop.id} className="price-row">
              <span className="price-shop">
                {shop.name}
                {cheapestShopId === shop.id && <span className="chip">cheapest</span>}
              </span>
              <div className="row">
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={draft.size}
                  onChange={(e) => update(shop.id, { size: e.target.value })}
                  placeholder="Pack size"
                />
                <UnitSelect
                  units={units}
                  value={draft.unit}
                  onChange={(unit) => update(shop.id, { unit })}
                />
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={draft.price}
                  onChange={(e) => update(shop.id, { price: e.target.value })}
                  placeholder="Price"
                />
                <span className="unit-fixed">RON</span>
              </div>
              <span className="meta muted">
                {ppu !== null ? formatPricePerUnit(ppu, dimension) : "—"}
              </span>
            </div>
          );
        })}
      </div>
      <div className="row">
        <button type="submit">Save prices</button>
        <button type="button" className="ghost" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Build a `put` op for a recipe (its id is reused across the put/delete lifecycle). */
function recipePutOp(recipe: Recipe): SyncOp {
  return {
    entity: ENTITY_RECIPE,
    id: recipe.id,
    op: "put",
    updatedAt: recipe.updatedAt,
    payload: recipe,
  };
}

/** Build a `put` op for one recipe ingredient line. */
function recipeIngredientPutOp(
  id: string,
  recipeId: string,
  ingredientId: string,
  quantity: number,
): SyncOp {
  const now = Date.now();
  const line: RecipeIngredient = { id, recipeId, ingredientId, quantity, updatedAt: now };
  return { entity: ENTITY_RECIPE_INGREDIENT, id, op: "put", updatedAt: now, payload: line };
}

/** Split a comma-separated tag input into trimmed, de-duplicated, non-empty tags. */
function parseTags(input: string): string[] {
  const seen = new Set<string>();
  for (const raw of input.split(",")) {
    const tag = raw.trim();
    if (tag) seen.add(tag);
  }
  return [...seen];
}

/** Split a multi-line steps input into trimmed, non-empty ordered steps (one per line). */
function parseSteps(input: string): string[] {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Cookbook view: browse/search recipes filtered by category and tag, add a recipe, and per
 * recipe view its scaled ingredient lines and steps or edit it. Deleting a recipe also drops
 * its ingredient lines (a single offline writer, so the order is safe). Every edit rides the
 * same offline outbox / realtime sync as the rest of the app.
 */
function CookbookPanel({
  recipes,
  recipeIngredients,
  ingredients,
}: {
  recipes: Recipe[];
  recipeIngredients: RecipeIngredient[];
  ingredients: Ingredient[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<RecipeCategory | "ALL">("ALL");
  const [tag, setTag] = useState<string>("ALL");

  // Every distinct tag in use, for the tag filter dropdown.
  const allTags = [...new Set(recipes.flatMap((r) => r.tags))].sort((a, b) => a.localeCompare(b));

  const query = search.trim().toLowerCase();
  const filtered = recipes.filter((recipe) => {
    if (category !== "ALL" && recipe.category !== category) return false;
    if (tag !== "ALL" && !recipe.tags.includes(tag)) return false;
    if (query && !recipe.name.toLowerCase().includes(query)) return false;
    return true;
  });

  const linesOf = (recipeId: string) => recipeIngredients.filter((ri) => ri.recipeId === recipeId);

  const removeRecipe = async (recipe: Recipe) => {
    await engine.enqueue({
      entity: ENTITY_RECIPE,
      id: recipe.id,
      op: "delete",
      updatedAt: Date.now(),
    });
    for (const line of linesOf(recipe.id)) {
      await engine.enqueue({
        entity: ENTITY_RECIPE_INGREDIENT,
        id: line.id,
        op: "delete",
        updatedAt: Date.now(),
      });
    }
  };

  return (
    <>
      <p className="muted">
        Recipes the camp cooks from. Set how many servings a recipe makes; viewing it lets you
        scale every ingredient to a different headcount. Edits sync on reconnect and appear live
        on other devices.
      </p>

      {creating ? (
        <RecipeForm
          ingredients={ingredients}
          lines={[]}
          onCancel={() => setCreating(false)}
          onDone={() => setCreating(false)}
        />
      ) : (
        <button onClick={() => setCreating(true)}>Add recipe</button>
      )}

      <div className="row filters">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recipes…"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value as RecipeCategory | "ALL")}>
          <option value="ALL">All categories</option>
          {RECIPE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {RECIPE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        {allTags.length > 0 && (
          <select value={tag} onChange={(e) => setTag(e.target.value)}>
            <option value="ALL">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </div>

      <ul className="catalog">
        {recipes.length === 0 && <li className="muted">No recipes yet.</li>}
        {recipes.length > 0 && filtered.length === 0 && (
          <li className="muted">No recipes match the current filters.</li>
        )}
        {filtered.map((recipe) =>
          editingId === recipe.id ? (
            <li key={recipe.id} className="catalog-item">
              <RecipeForm
                initial={recipe}
                ingredients={ingredients}
                lines={linesOf(recipe.id)}
                onCancel={() => setEditingId(null)}
                onDone={() => setEditingId(null)}
              />
            </li>
          ) : (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              lines={linesOf(recipe.id)}
              ingredients={ingredients}
              onEdit={() => setEditingId(recipe.id)}
              onDelete={() => void removeRecipe(recipe)}
            />
          ),
        )}
      </ul>
    </>
  );
}

/**
 * One recipe row: header (name, category, tags, base servings) with View/Edit/Delete. Viewing
 * expands a serving scaler — changing the target rescales every ingredient line by ratio via
 * the pure `scaling` module (display rounded by `units`) — plus the ordered cooking steps.
 */
function RecipeCard({
  recipe,
  lines,
  ingredients,
  onEdit,
  onDelete,
}: {
  recipe: Recipe;
  lines: RecipeIngredient[];
  ingredients: Ingredient[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [target, setTarget] = useState(recipe.baseServings);

  // Join each line to its catalog ingredient for the name + dimension, then scale to `target`.
  const scalable = lines.map((line) => {
    const ing = ingredients.find((i) => i.id === line.ingredientId);
    return {
      id: line.id,
      name: ing?.name ?? "(removed ingredient)",
      quantity: line.quantity,
      dimension: ing?.dimension ?? ("COUNT" as Dimension),
    };
  });
  const scaled = scaleRecipe(scalable, recipe.baseServings, target);

  return (
    <li className="catalog-item">
      <div className="row between">
        <div className="ingredient-info">
          <span className="ingredient-name">{recipe.name}</span>
          <span className="meta">
            <span className="chip">{RECIPE_CATEGORY_LABELS[recipe.category]}</span>
            <span className="muted">Serves {recipe.baseServings}</span>
          </span>
          {recipe.tags.length > 0 && (
            <span className="meta">
              {recipe.tags.map((t) => (
                <span key={t} className="chip">
                  {t}
                </span>
              ))}
            </span>
          )}
        </div>
        <div className="row">
          <button className="ghost small" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Hide" : "View"}
          </button>
          <button className="ghost small" onClick={onEdit}>
            Edit
          </button>
          <button className="ghost small" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>

      {expanded && (
        <div className="recipe-detail">
          <div className="row serving-control">
            <span className="field-label">Scale to</span>
            <button
              type="button"
              className="ghost small"
              onClick={() => setTarget((s) => Math.max(1, s - 1))}
            >
              −
            </button>
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={target}
              onChange={(e) => {
                const n = Math.floor(Number(e.target.value));
                setTarget(Number.isFinite(n) && n >= 1 ? n : 1);
              }}
            />
            <button type="button" className="ghost small" onClick={() => setTarget((s) => s + 1)}>
              +
            </button>
            <span className="muted">servings</span>
            {target !== recipe.baseServings && (
              <button
                type="button"
                className="ghost small"
                onClick={() => setTarget(recipe.baseServings)}
              >
                Reset
              </button>
            )}
          </div>

          <ul className="recipe-lines">
            {scaled.length === 0 && <li className="muted">No ingredients yet.</li>}
            {scaled.map((line) => (
              <li key={line.id} className="row between">
                <span>{line.name}</span>
                <span className="muted">{line.display}</span>
              </li>
            ))}
          </ul>

          {recipe.steps.length > 0 && (
            <ol className="recipe-steps">
              {recipe.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}
        </div>
      )}
    </li>
  );
}

/** A draft ingredient line in the recipe editor: kept id, chosen ingredient, quantity + unit. */
interface LineDraft {
  id: string;
  ingredientId: string;
  qty: string;
  unit: string;
}

/**
 * Add/edit form for a recipe: identity (name, base servings, category), free tags, ordered
 * steps, and a dynamic list of ingredient lines drawn from the catalog. On save the recipe is
 * upserted, filled lines are upserted, and any previously-saved line dropped here is deleted.
 */
function RecipeForm({
  initial,
  ingredients,
  lines,
  onDone,
  onCancel,
}: {
  initial?: Recipe;
  ingredients: Ingredient[];
  lines: RecipeIngredient[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [baseServings, setBaseServings] = useState(String(initial?.baseServings ?? 4));
  const [category, setCategory] = useState<RecipeCategory>(initial?.category ?? "DINNER");
  const [tagsInput, setTagsInput] = useState(initial?.tags.join(", ") ?? "");
  const [stepsInput, setStepsInput] = useState(initial?.steps.join("\n") ?? "");

  const ingredientById = (id: string) => ingredients.find((i) => i.id === id);
  const unitsFor = (id: string) => {
    const ing = ingredientById(id);
    return ing ? inputUnitsForDimension(ing.dimension) : (["g", "kg"] as const);
  };

  // Seed drafts from the recipe's existing lines, shown in each ingredient's readable unit.
  const [drafts, setDrafts] = useState<LineDraft[]>(() =>
    lines.map((line) => {
      const ing = ingredientById(line.ingredientId);
      const display = ing ? fromBase(line.quantity, ing.dimension) : null;
      return {
        id: line.id,
        ingredientId: line.ingredientId,
        qty: display ? String(display.value) : String(line.quantity),
        unit: display ? display.unit : unitsFor(line.ingredientId)[0],
      };
    }),
  );

  const updateDraft = (id: string, patch: Partial<LineDraft>) =>
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const addLine = () =>
    setDrafts((prev) => [
      ...prev,
      { id: crypto.randomUUID(), ingredientId: "", qty: "", unit: "g" },
    ]);

  const removeLine = (id: string) => setDrafts((prev) => prev.filter((d) => d.id !== id));

  // When the chosen ingredient changes, reset the unit to that ingredient's base input unit.
  const pickIngredient = (id: string, ingredientId: string) =>
    updateDraft(id, { ingredientId, unit: unitsFor(ingredientId)[0] });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const servingsNum = Math.floor(Number(baseServings));
    const servings = Number.isFinite(servingsNum) && servingsNum > 0 ? servingsNum : 1;

    const recipe: Recipe = {
      id: initial?.id ?? crypto.randomUUID(),
      name: trimmedName,
      baseServings: servings,
      category,
      tags: parseTags(tagsInput),
      steps: parseSteps(stepsInput),
      updatedAt: Date.now(),
    };
    await engine.enqueue(recipePutOp(recipe));

    // Upsert every valid draft; delete any previously-saved line not kept here.
    const keptIds = new Set<string>();
    for (const draft of drafts) {
      const qty = Number(draft.qty);
      const valid =
        ingredientById(draft.ingredientId) !== undefined &&
        draft.qty.trim() !== "" &&
        Number.isFinite(qty) &&
        qty > 0;
      if (!valid) continue;
      keptIds.add(draft.id);
      await engine.enqueue(
        recipeIngredientPutOp(draft.id, recipe.id, draft.ingredientId, toBase(qty, draft.unit)),
      );
    }
    for (const line of lines) {
      if (!keptIds.has(line.id)) {
        await engine.enqueue({
          entity: ENTITY_RECIPE_INGREDIENT,
          id: line.id,
          op: "delete",
          updatedAt: Date.now(),
        });
      }
    }
    onDone();
  };

  return (
    <form onSubmit={save} className="add-form">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Recipe name…"
        autoFocus
      />
      <div className="row">
        <label className="field">
          <span className="field-label">Base servings</span>
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={baseServings}
            onChange={(e) => setBaseServings(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as RecipeCategory)}>
            {RECIPE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {RECIPE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <input
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="Tags, comma-separated (vegetarian, campfire, quick)"
      />

      <label className="field">
        <span className="field-label">Steps (one per line)</span>
        <textarea
          value={stepsInput}
          onChange={(e) => setStepsInput(e.target.value)}
          placeholder={"Mix the dry ingredients\nAdd milk and eggs\nFry until golden"}
          rows={4}
        />
      </label>

      <div className="field">
        <span className="field-label">Ingredients</span>
        {ingredients.length === 0 ? (
          <span className="muted">Add ingredients in the Catalog first to add lines.</span>
        ) : (
          <div className="recipe-lines">
            {drafts.map((draft) => (
              <div key={draft.id} className="row line-row">
                <select
                  value={draft.ingredientId}
                  onChange={(e) => pickIngredient(draft.id, e.target.value)}
                >
                  <option value="">Pick ingredient…</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={draft.qty}
                  onChange={(e) => updateDraft(draft.id, { qty: e.target.value })}
                  placeholder="Qty"
                />
                <UnitSelect
                  units={unitsFor(draft.ingredientId)}
                  value={draft.unit}
                  onChange={(unit) => updateDraft(draft.id, { unit })}
                />
                <button
                  type="button"
                  className="ghost small"
                  onClick={() => removeLine(draft.id)}
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="ghost small" onClick={addLine}>
              Add ingredient line
            </button>
          </div>
        )}
      </div>

      <div className="row">
        <button type="submit" disabled={name.trim().length === 0}>
          {initial ? "Save recipe" : "Add recipe"}
        </button>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Build a `put` op for a camp (its id is reused across the put/delete lifecycle). */
function campPutOp(camp: Camp): SyncOp {
  return { entity: ENTITY_CAMP, id: camp.id, op: "put", updatedAt: camp.updatedAt, payload: camp };
}

/** Build a `put` op for one menu placement. */
function menuEntryPutOp(entry: MenuEntry): SyncOp {
  return {
    entity: ENTITY_MENU_ENTRY,
    id: entry.id,
    op: "put",
    updatedAt: entry.updatedAt,
    payload: entry,
  };
}

/** A camp day (`YYYY-MM-DD`) as a short weekday/date label, e.g. "mie., 1 iul.". */
function formatDayLabel(iso: string): string {
  // Parse as local midnight; only weekday/day/month are shown, so no timezone subtlety.
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

/**
 * Camps view: list of planned outings with create/edit/delete, and a per-camp menu grid.
 * Deleting a camp also drops its menu placements (a single offline writer, so the order is
 * safe). Selecting a camp opens its day/meal-slot grid. Every edit rides the same offline
 * outbox / realtime sync as the rest of the app.
 */
function CampsPanel({
  camps,
  menuEntries,
  recipes,
  recipeIngredients,
  ingredients,
}: {
  camps: Camp[];
  menuEntries: MenuEntry[];
  recipes: Recipe[];
  recipeIngredients: RecipeIngredient[];
  ingredients: Ingredient[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const entriesOf = (campId: string) => menuEntries.filter((e) => e.campId === campId);

  const removeCamp = async (camp: Camp) => {
    await engine.enqueue({ entity: ENTITY_CAMP, id: camp.id, op: "delete", updatedAt: Date.now() });
    for (const entry of entriesOf(camp.id)) {
      await engine.enqueue({
        entity: ENTITY_MENU_ENTRY,
        id: entry.id,
        op: "delete",
        updatedAt: Date.now(),
      });
    }
  };

  // When a camp is open, show its menu grid instead of the list.
  const openCamp = openId ? camps.find((c) => c.id === openId) : undefined;
  if (openCamp) {
    return (
      <MenuGrid
        camp={openCamp}
        menuEntries={entriesOf(openCamp.id)}
        recipes={recipes}
        recipeIngredients={recipeIngredients}
        ingredients={ingredients}
        onBack={() => setOpenId(null)}
      />
    );
  }

  return (
    <>
      <p className="muted">
        Plan an outing: set its dates and headcount, then fill each day&rsquo;s meal slots with
        recipes. Menu recipes scale to the headcount; a placement can override its servings. Edits
        sync on reconnect and appear live on other devices.
      </p>

      {creating ? (
        <CampForm onCancel={() => setCreating(false)} onDone={() => setCreating(false)} />
      ) : (
        <button onClick={() => setCreating(true)}>Add camp</button>
      )}

      <ul className="catalog">
        {camps.length === 0 && <li className="muted">No camps yet.</li>}
        {camps.map((camp) =>
          editingId === camp.id ? (
            <li key={camp.id} className="catalog-item">
              <CampForm
                initial={camp}
                onCancel={() => setEditingId(null)}
                onDone={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li key={camp.id} className="catalog-item row between">
              <div className="ingredient-info">
                <span className="ingredient-name">{camp.name}</span>
                <span className="meta muted">
                  {formatDayLabel(camp.startDate)} – {formatDayLabel(camp.endDate)} ·{" "}
                  {campDays(camp.startDate, camp.endDate).length} days · {camp.headcount} people
                </span>
              </div>
              <div className="row">
                <button className="ghost small" onClick={() => setOpenId(camp.id)}>
                  Menu
                </button>
                <button className="ghost small" onClick={() => setEditingId(camp.id)}>
                  Edit
                </button>
                <button className="ghost small" onClick={() => void removeCamp(camp)}>
                  Delete
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
    </>
  );
}

/** Add/edit form for a camp: name, inclusive start/end dates, and headcount. */
function CampForm({
  initial,
  onDone,
  onCancel,
}: {
  initial?: Camp;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [headcount, setHeadcount] = useState(String(initial?.headcount ?? 8));
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!startDate || !endDate) {
      setError("Pick a start and end date.");
      return;
    }
    if (endDate < startDate) {
      setError("The end date can't be before the start date.");
      return;
    }
    const headNum = Math.floor(Number(headcount));
    const head = Number.isFinite(headNum) && headNum > 0 ? headNum : 1;

    const camp: Camp = {
      id: initial?.id ?? crypto.randomUUID(),
      name: trimmed,
      startDate,
      endDate,
      headcount: head,
      updatedAt: Date.now(),
    };
    await engine.enqueue(campPutOp(camp));
    onDone();
  };

  return (
    <form onSubmit={submit} className="add-form">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Camp name…"
        autoFocus
      />
      <div className="row">
        <label className="field">
          <span className="field-label">Start date</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">End date</span>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
      </div>
      <label className="field">
        <span className="field-label">Headcount</span>
        <input
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={headcount}
          onChange={(e) => setHeadcount(e.target.value)}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button type="submit" disabled={name.trim().length === 0}>
          {initial ? "Save camp" : "Add camp"}
        </button>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/**
 * A camp's week-at-a-glance menu: one section per day, each with the five ordered meal slots.
 * Each slot lists its placed recipes (auto-scaled to the camp headcount, or a per-placement
 * override) and a picker to add another. Placements read live from the offline mirror.
 */
function MenuGrid({
  camp,
  menuEntries,
  recipes,
  recipeIngredients,
  ingredients,
  onBack,
}: {
  camp: Camp;
  menuEntries: MenuEntry[];
  recipes: Recipe[];
  recipeIngredients: RecipeIngredient[];
  ingredients: Ingredient[];
  onBack: () => void;
}) {
  const days = campDays(camp.startDate, camp.endDate);

  const addRecipe = (date: string, slot: MealSlot, recipeId: string) =>
    engine.enqueue(
      menuEntryPutOp({
        id: crypto.randomUUID(),
        campId: camp.id,
        date,
        slot,
        recipeId,
        updatedAt: Date.now(),
      }),
    );

  return (
    <>
      <div className="row between">
        <button className="ghost small" onClick={onBack}>
          ← All camps
        </button>
        <span className="muted">{camp.headcount} people</span>
      </div>
      <h2 className="menu-title">{camp.name}</h2>

      {recipes.length === 0 && (
        <p className="muted">No recipes yet — add some in the Cookbook to build a menu.</p>
      )}

      <div className="menu-days">
        {days.map((day) => (
          <section key={day} className="menu-day">
            <h3 className="day-header">{formatDayLabel(day)}</h3>
            {MEAL_SLOTS.map((slot) => {
              const entries = menuEntries.filter((e) => e.date === day && e.slot === slot);
              return (
                <div key={slot} className="menu-slot">
                  <span className="slot-label">{MEAL_SLOT_LABELS[slot]}</span>
                  <ul className="slot-entries">
                    {entries.length === 0 && <li className="muted slot-empty">—</li>}
                    {entries.map((entry) => (
                      <MenuEntryRow
                        key={entry.id}
                        entry={entry}
                        camp={camp}
                        recipe={recipes.find((r) => r.id === entry.recipeId)}
                        recipeIngredients={recipeIngredients}
                        ingredients={ingredients}
                      />
                    ))}
                  </ul>
                  {recipes.length > 0 && (
                    <SlotAdder
                      recipes={recipes}
                      onAdd={(recipeId) => void addRecipe(day, slot, recipeId)}
                    />
                  )}
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </>
  );
}

/** A pick-to-add recipe dropdown for one day/slot; resets after each pick. */
function SlotAdder({
  recipes,
  onAdd,
}: {
  recipes: Recipe[];
  onAdd: (recipeId: string) => void;
}) {
  return (
    <select
      className="slot-add"
      value=""
      onChange={(e) => {
        if (e.target.value) onAdd(e.target.value);
      }}
    >
      <option value="">+ Add recipe…</option>
      {recipes.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>
  );
}

/**
 * One placed recipe in a slot: name and its effective servings (the camp headcount, or this
 * placement's override). Expanding shows a serving stepper — changing it persists a
 * per-placement override (clearing it when set back to the headcount) — and the ingredient
 * lines scaled to that target via the pure `scaling` module.
 */
function MenuEntryRow({
  entry,
  camp,
  recipe,
  recipeIngredients,
  ingredients,
}: {
  entry: MenuEntry;
  camp: Camp;
  recipe?: Recipe;
  recipeIngredients: RecipeIngredient[];
  ingredients: Ingredient[];
}) {
  const [expanded, setExpanded] = useState(false);
  const effective = entry.servingsOverride ?? camp.headcount;
  const overridden = entry.servingsOverride !== undefined;

  // Local draft for the number field, kept in step with the persisted value; committed on blur.
  const [draft, setDraft] = useState(String(effective));
  useEffect(() => setDraft(String(effective)), [effective]);

  const remove = () =>
    engine.enqueue({
      entity: ENTITY_MENU_ENTRY,
      id: entry.id,
      op: "delete",
      updatedAt: Date.now(),
    });

  // Persist a new serving target: equal to the headcount clears the override, else stores it.
  const commit = (servings: number) => {
    const n = Math.max(1, Math.floor(servings));
    void engine.enqueue(
      menuEntryPutOp({
        ...entry,
        servingsOverride: n === camp.headcount ? undefined : n,
        updatedAt: Date.now(),
      }),
    );
  };

  // Join the recipe's lines to the catalog for name + dimension, then scale to `effective`.
  const lines = recipe ? recipeIngredients.filter((ri) => ri.recipeId === recipe.id) : [];
  const scalable = lines.map((line) => {
    const ing = ingredients.find((i) => i.id === line.ingredientId);
    return {
      id: line.id,
      name: ing?.name ?? "(removed ingredient)",
      quantity: line.quantity,
      dimension: ing?.dimension ?? ("COUNT" as Dimension),
    };
  });
  const scaled = recipe ? scaleRecipe(scalable, recipe.baseServings, effective) : [];

  return (
    <li className="slot-entry">
      <div className="row between">
        <div className="ingredient-info">
          <span className="entry-name">{recipe ? recipe.name : "(removed recipe)"}</span>
          <span className="meta muted">
            {effective} servings
            {overridden && <span className="chip">override</span>}
          </span>
        </div>
        <div className="row">
          {recipe && (
            <button className="ghost small" onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Hide" : "View"}
            </button>
          )}
          <button className="ghost small" onClick={() => void remove()}>
            ✕
          </button>
        </div>
      </div>

      {expanded && recipe && (
        <div className="recipe-detail">
          <div className="row serving-control">
            <span className="field-label">Serves</span>
            <button type="button" className="ghost small" onClick={() => commit(effective - 1)}>
              −
            </button>
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                const n = Math.floor(Number(draft));
                commit(Number.isFinite(n) && n >= 1 ? n : effective);
              }}
            />
            <button type="button" className="ghost small" onClick={() => commit(effective + 1)}>
              +
            </button>
            {overridden && (
              <button
                type="button"
                className="ghost small"
                onClick={() => commit(camp.headcount)}
              >
                Reset to {camp.headcount}
              </button>
            )}
          </div>

          <ul className="recipe-lines">
            {scaled.length === 0 && <li className="muted">No ingredients yet.</li>}
            {scaled.map((line) => (
              <li key={line.id} className="row between">
                <span>{line.name}</span>
                <span className="muted">{line.display}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

/** Build a `put` op for one shopping line. */
function shoppingItemPutOp(item: ShoppingItem): SyncOp {
  return {
    entity: ENTITY_SHOPPING_ITEM,
    id: item.id,
    op: "put",
    updatedAt: item.updatedAt,
    payload: item,
  };
}

/**
 * Shopping view: pick a camp, then its buy list — auto lines from the menu's scaled needs minus
 * inventory (the `needs` module), plus manual and restock lines. Each line is priced via the
 * `pricing` module (cheapest shop, whole packages, line cost) with an estimated list total.
 * "Regenerate from menu" reconciles only the auto lines against the current menu/stock; manual
 * and restock lines are left alone. Marking a line bought records the quantity actually received
 * and adds it to the ingredient's stock (issue 0009). Every edit rides the same offline outbox /
 * realtime sync.
 */
function ShoppingPanel({
  camps,
  shoppingItems,
  menuEntries,
  recipes,
  recipeIngredients,
  ingredients,
  shops,
  shopPrices,
}: {
  camps: Camp[];
  shoppingItems: ShoppingItem[];
  menuEntries: MenuEntry[];
  recipes: Recipe[];
  recipeIngredients: RecipeIngredient[];
  ingredients: Ingredient[];
  shops: Shop[];
  shopPrices: ShopPrice[];
}) {
  const [campId, setCampId] = useState<string>("");

  // Default to the first camp once camps load, and recover if the open camp is deleted.
  useEffect(() => {
    const first = camps[0];
    if (first && !camps.some((c) => c.id === campId)) {
      setCampId(first.id);
    }
  }, [camps, campId]);

  if (camps.length === 0) {
    return (
      <p className="muted">
        No camps yet — create one in the Camps tab to build its shopping list.
      </p>
    );
  }

  const camp = camps.find((c) => c.id === campId);
  if (!camp) return null;

  // Compute the camp's needs: scale each placement's lines, sum per ingredient, net off stock.
  const sources: NeedSource[] = menuEntries
    .filter((e) => e.campId === camp.id)
    .map((entry): NeedSource | null => {
      const recipe = recipes.find((r) => r.id === entry.recipeId);
      if (!recipe) return null;
      const lines = recipeIngredients.filter((ri) => ri.recipeId === recipe.id);
      return {
        baseServings: recipe.baseServings,
        targetServings: entry.servingsOverride ?? camp.headcount,
        lines: lines.map((l) => ({ ingredientId: l.ingredientId, quantity: l.quantity })),
      };
    })
    .filter((s): s is NeedSource => s !== null);

  const stock = new Map(ingredients.map((i) => [i.id, i.stockQty]));
  const needs = shoppingNeeds(sources, stock).filter((n) => n.toBuy > 0);

  const items = shoppingItems.filter((i) => i.campId === camp.id);

  // Reconcile auto lines against the current needs; manual/restock lines are never touched.
  // Already-bought auto lines are frozen records (their receipt is in stock), so regeneration
  // skips them too — any remaining shortfall surfaces as a fresh unbought line.
  const regenerate = async () => {
    const autoItems = items.filter((i) => i.source === "auto" && i.received === undefined);
    const neededIds = new Set(needs.map((n) => n.ingredientId));
    for (const need of needs) {
      const existing = autoItems.find((a) => a.ingredientId === need.ingredientId);
      await engine.enqueue(
        shoppingItemPutOp({
          id: existing?.id ?? crypto.randomUUID(),
          campId: camp.id,
          ingredientId: need.ingredientId,
          source: "auto",
          quantity: need.toBuy,
          updatedAt: Date.now(),
        }),
      );
    }
    // Drop auto lines the menu no longer needs (e.g. a recipe removed or now covered by stock).
    for (const auto of autoItems) {
      if (!neededIds.has(auto.ingredientId)) {
        await engine.enqueue({
          entity: ENTITY_SHOPPING_ITEM,
          id: auto.id,
          op: "delete",
          updatedAt: Date.now(),
        });
      }
    }
  };

  // Price every line against its ingredient's offers (at shops that still exist) and total them.
  const priced = items.map((item) => {
    const ingredient = ingredients.find((i) => i.id === item.ingredientId);
    const offers = shopPrices.filter(
      (p) => p.ingredientId === item.ingredientId && shops.some((s) => s.id === p.shopId),
    );
    return { item, ingredient, line: priceLine(item.quantity, offers) };
  });
  // The estimate is what's still left to buy, so bought lines drop out of the total.
  const remaining = estimateTotal(
    priced.filter((p) => p.item.received === undefined).map((p) => p.line),
  );

  const sorted = [...priced].sort((a, b) =>
    (a.ingredient?.name ?? "").localeCompare(b.ingredient?.name ?? "", LOCALE),
  );

  const removeItem = (item: ShoppingItem) =>
    engine.enqueue({
      entity: ENTITY_SHOPPING_ITEM,
      id: item.id,
      op: "delete",
      updatedAt: Date.now(),
    });

  // Mark a line bought: add the received quantity to the ingredient's stock (issue 0009) and
  // stamp the line so it stops counting toward the estimate and won't be regenerated.
  const buy = (item: ShoppingItem, ingredient: Ingredient, received: number) => {
    void engine.enqueue(
      stockPutOp(ingredient, ingredient.stockQty + received, ingredient.parLevel),
    );
    void engine.enqueue(shoppingItemPutOp({ ...item, received, updatedAt: Date.now() }));
  };

  return (
    <>
      <p className="muted">
        A camp&rsquo;s buy list: menu needs minus what&rsquo;s in stock, plus manual and restock
        lines. Each line shows the cheapest shop, whole packages to buy, and the cost. Mark a line
        bought to add what you received into inventory. Regenerate after a menu or inventory change.
      </p>

      <div className="row filters">
        <select value={campId} onChange={(e) => setCampId(e.target.value)}>
          {camps.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button onClick={() => void regenerate()}>Regenerate from menu</button>
      </div>
      <p className="muted">
        {needs.length > 0
          ? `${needs.length} ingredient${needs.length === 1 ? "" : "s"} needed from the menu after stock.`
          : "The menu needs nothing beyond current stock."}
      </p>

      <ManualItemForm camp={camp} ingredients={ingredients} />

      <ul className="catalog">
        {sorted.length === 0 && (
          <li className="muted">No items yet. Regenerate from the menu or add one above.</li>
        )}
        {sorted.map(({ item, ingredient, line }) => (
          <ShoppingItemRow
            key={item.id}
            item={item}
            ingredient={ingredient}
            line={line}
            shops={shops}
            onRemove={() => void removeItem(item)}
            onBuy={(received) => {
              if (ingredient) buy(item, ingredient, received);
            }}
          />
        ))}
      </ul>

      {sorted.length > 0 && (
        <div className="row between shopping-total">
          <span className="ingredient-name">Estimated remaining</span>
          <span className="ingredient-name">{formatCurrency(remaining)}</span>
        </div>
      )}
    </>
  );
}

/**
 * One shopping line. Until bought it shows the planned quantity and the cheapest-shop
 * packages/cost, with a **Bought** action that opens the receive editor. Once bought it shows the
 * received amount and a "bought" badge instead — the receipt is already in inventory (issue 0009).
 */
function ShoppingItemRow({
  item,
  ingredient,
  line,
  shops,
  onRemove,
  onBuy,
}: {
  item: ShoppingItem;
  ingredient?: Ingredient;
  line: PriceLine | null;
  shops: Shop[];
  onRemove: () => void;
  onBuy: (received: number) => void;
}) {
  const [buying, setBuying] = useState(false);
  const bought = item.received !== undefined;
  const shopName = line ? shops.find((s) => s.id === line.shopId)?.name : undefined;

  if (buying && ingredient) {
    return (
      <li className="catalog-item">
        <ReceiveForm
          ingredient={ingredient}
          planned={item.quantity}
          onCancel={() => setBuying(false)}
          onConfirm={(received) => {
            onBuy(received);
            setBuying(false);
          }}
        />
      </li>
    );
  }

  return (
    <li className={bought ? "catalog-item row between bought" : "catalog-item row between"}>
      <div className="ingredient-info">
        <span className="ingredient-name">
          {ingredient ? ingredient.name : "(removed ingredient)"}
          <span className="chip">{SHOPPING_SOURCE_LABELS[item.source]}</span>
          {bought && <span className="chip done">bought</span>}
        </span>
        {bought ? (
          <span className="meta muted">
            Received{" "}
            {ingredient
              ? formatQuantity(item.received ?? 0, ingredient.dimension)
              : (item.received ?? 0)}{" "}
            into stock
          </span>
        ) : (
          <span className="meta muted">
            {ingredient ? formatQuantity(item.quantity, ingredient.dimension) : item.quantity}
            {line && shopName ? (
              <>
                {` · ${line.packages} pkg · ${formatCurrency(line.cost)} · `}
                <span className="chip">{shopName}</span>
              </>
            ) : (
              " · no price"
            )}
          </span>
        )}
      </div>
      <div className="row">
        {!bought && ingredient && (
          <button className="ghost small" onClick={() => setBuying(true)}>
            Bought
          </button>
        )}
        <button className="ghost small" onClick={onRemove}>
          ✕
        </button>
      </div>
    </li>
  );
}

/**
 * The receive editor shown when marking a line bought: the quantity actually received (in a unit
 * the ingredient's dimension allows) defaults to the planned amount and is editable before
 * confirming. Confirming hands the caller the received quantity in base units to add to stock.
 */
function ReceiveForm({
  ingredient,
  planned,
  onConfirm,
  onCancel,
}: {
  ingredient: Ingredient;
  planned: number;
  onConfirm: (received: number) => void;
  onCancel: () => void;
}) {
  const dimension = ingredient.dimension;
  const units = inputUnitsForDimension(dimension);
  const plannedDisplay = fromBase(planned, dimension);
  const [value, setValue] = useState(String(plannedDisplay.value));
  const [unit, setUnit] = useState<string>(plannedDisplay.unit);

  const confirm = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(value);
    const received = Number.isFinite(n) && n >= 0 ? toBase(n, unit) : planned;
    onConfirm(received);
  };

  return (
    <form onSubmit={confirm} className="add-form">
      <span className="ingredient-name">{ingredient.name}</span>
      <label className="field">
        <span className="field-label">Received into stock</span>
        <div className="row">
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
          <UnitSelect units={units} value={unit} onChange={setUnit} />
        </div>
      </label>
      <div className="row">
        <button type="submit">Confirm purchase</button>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Add a manual shopping line: pick a catalog ingredient and a quantity (in a valid unit). */
function ManualItemForm({ camp, ingredients }: { camp: Camp; ingredients: Ingredient[] }) {
  const [ingredientId, setIngredientId] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState<string>("g");

  const ingredient = ingredients.find((i) => i.id === ingredientId);
  const units = ingredient ? inputUnitsForDimension(ingredient.dimension) : (["g", "kg"] as const);

  // Reset the unit to the chosen ingredient's base input unit when the ingredient changes.
  const pick = (id: string) => {
    setIngredientId(id);
    const next = ingredients.find((i) => i.id === id);
    setUnit(next ? inputUnitsForDimension(next.dimension)[0] : "g");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(qty);
    if (!ingredient || qty.trim() === "" || !Number.isFinite(n) || n <= 0) return;
    await engine.enqueue(
      shoppingItemPutOp({
        id: crypto.randomUUID(),
        campId: camp.id,
        ingredientId: ingredient.id,
        source: "manual",
        quantity: toBase(n, unit),
        updatedAt: Date.now(),
      }),
    );
    setIngredientId("");
    setQty("");
    setUnit("g");
  };

  if (ingredients.length === 0) {
    return <p className="muted">Add ingredients in the Catalog to add manual items.</p>;
  }

  return (
    <form onSubmit={submit} className="add-form">
      <div className="row line-row">
        <select value={ingredientId} onChange={(e) => pick(e.target.value)}>
          <option value="">Add item…</option>
          {ingredients.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="Qty"
        />
        <UnitSelect units={units} value={unit} onChange={setUnit} />
        <button type="submit" disabled={!ingredient || qty.trim() === ""}>
          Add
        </button>
      </div>
    </form>
  );
}

/** Build a `put` op for one expense entry. */
function expensePutOp(expense: Expense): SyncOp {
  return {
    entity: ENTITY_EXPENSE,
    id: expense.id,
    op: "put",
    updatedAt: expense.updatedAt,
    payload: expense,
  };
}

/**
 * Expenses view: pick a camp, then its manual spending ledger — each entry an amount in RON, a
 * label, an optional category, and an optional camp day. A running total sums every logged entry.
 * This ledger is deliberately separate from the shopping list's *estimate* (issue 0008): marking
 * a shopping line bought does not post here. Every edit rides the same offline outbox / realtime
 * sync as the rest of the app.
 */
function ExpensesPanel({ camps, expenses }: { camps: Camp[]; expenses: Expense[] }) {
  const [campId, setCampId] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Default to the first camp once camps load, and recover if the open camp is deleted.
  useEffect(() => {
    const first = camps[0];
    if (first && !camps.some((c) => c.id === campId)) {
      setCampId(first.id);
    }
  }, [camps, campId]);

  if (camps.length === 0) {
    return (
      <p className="muted">No camps yet — create one in the Camps tab to log its expenses.</p>
    );
  }

  const camp = camps.find((c) => c.id === campId);
  if (!camp) return null;

  // Dated entries first in date order; undated ones sink to the bottom ("~" sorts after digits).
  // Ties (and undated entries) break most-recent first.
  const items = [...expenses.filter((e) => e.campId === camp.id)].sort(
    (a, b) => (a.day ?? "~").localeCompare(b.day ?? "~") || b.updatedAt - a.updatedAt,
  );
  const total = items.reduce((sum, e) => sum + e.amount, 0);

  const removeExpense = (expense: Expense) =>
    engine.enqueue({
      entity: ENTITY_EXPENSE,
      id: expense.id,
      op: "delete",
      updatedAt: Date.now(),
    });

  return (
    <>
      <p className="muted">
        A camp&rsquo;s actual spending: log each purchase with an amount, a label, and an optional
        category and day. The total below sums every entry — it&rsquo;s separate from the shopping
        list&rsquo;s estimate. Edits sync on reconnect and appear live on other devices.
      </p>

      <div className="row filters">
        <select value={campId} onChange={(e) => setCampId(e.target.value)}>
          {camps.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Keyed by camp so the add form (incl. its day options) resets when switching camps. */}
      <ExpenseForm key={camp.id} camp={camp} />

      <ul className="catalog">
        {items.length === 0 && <li className="muted">No expenses logged yet.</li>}
        {items.map((expense) =>
          editingId === expense.id ? (
            <li key={expense.id} className="catalog-item">
              <ExpenseForm
                camp={camp}
                initial={expense}
                onDone={() => setEditingId(null)}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li key={expense.id} className="catalog-item row between">
              <div className="ingredient-info">
                <span className="ingredient-name">
                  {expense.label}
                  {expense.category && <span className="chip">{expense.category}</span>}
                </span>
                <span className="meta muted">
                  {formatCurrency(expense.amount)}
                  {expense.day && ` · ${formatDayLabel(expense.day)}`}
                </span>
              </div>
              <div className="row">
                <button className="ghost small" onClick={() => setEditingId(expense.id)}>
                  Edit
                </button>
                <button className="ghost small" onClick={() => void removeExpense(expense)}>
                  Delete
                </button>
              </div>
            </li>
          ),
        )}
      </ul>

      {items.length > 0 && (
        <div className="row between shopping-total">
          <span className="ingredient-name">Total logged</span>
          <span className="ingredient-name">{formatCurrency(total)}</span>
        </div>
      )}
    </>
  );
}

/**
 * Add/edit form for one expense: a label, an amount in RON, an optional category, and an optional
 * camp day picked from the camp's days. In add mode it mints a new id and resets after submit; in
 * edit mode it preserves the existing id and calls `onDone`. Saving enqueues a single put op.
 */
function ExpenseForm({
  camp,
  initial,
  onDone,
  onCancel,
}: {
  camp: Camp;
  initial?: Expense;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [day, setDay] = useState(initial?.day ?? "");

  const days = campDays(camp.startDate, camp.endDate);
  const amountNum = Number(amount);
  const valid =
    label.trim() !== "" && amount.trim() !== "" && Number.isFinite(amountNum) && amountNum > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    await engine.enqueue(
      expensePutOp({
        id: initial?.id ?? crypto.randomUUID(),
        campId: camp.id,
        amount: amountNum,
        label: label.trim(),
        category: category.trim() || undefined,
        day: day || undefined,
        updatedAt: Date.now(),
      }),
    );
    if (initial) {
      onDone?.();
    } else {
      setLabel("");
      setAmount("");
      setCategory("");
      setDay("");
    }
  };

  return (
    <form onSubmit={submit} className="add-form">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="What was bought…"
        autoFocus={!initial}
      />
      <div className="row">
        <label className="field">
          <span className="field-label">Amount</span>
          <div className="row">
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
            />
            <span className="unit-fixed">RON</span>
          </div>
        </label>
        <label className="field">
          <span className="field-label">Day (optional)</span>
          <select value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="">No day</option>
            {days.map((d) => (
              <option key={d} value={d}>
                {formatDayLabel(d)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Category (optional)"
      />
      <div className="row">
        <button type="submit" disabled={!valid}>
          {initial ? "Save" : "Add expense"}
        </button>
        {onCancel && (
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
