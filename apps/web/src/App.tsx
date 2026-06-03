import {
  DIMENSIONS,
  ENTITY_INGREDIENT,
  baseUnitForDimension,
  format as formatQuantity,
  type Dimension,
  type Ingredient,
  type SyncOp,
} from "@orions-cookbook/core";
import { useEffect, useState } from "react";
import { clearToken, getToken, login } from "./auth.js";
import { useIngredients, useOnlineStatus, usePendingCount } from "./hooks.js";
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
    <Catalog
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

function Catalog({ onLogout }: { onLogout: () => void }) {
  const ingredients = useIngredients();
  const online = useOnlineStatus();
  const pending = usePendingCount();
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
    <main className="card">
      <header className="row between">
        <h1>Ingredient catalog</h1>
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
    </main>
  );
}

/** The new fields a catalog entry needs; id/stockQty are carried or generated by the caller. */
type IngredientInput = Omit<Ingredient, "baseUnit" | "updatedAt">;

/**
 * Shared add/edit form. In "add" mode it mints a new id and zero stock; in "edit" mode it is
 * seeded from an existing ingredient and preserves its id and stock. `baseUnit` is never
 * entered — it is derived from the chosen dimension by the caller's `putOp`.
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
