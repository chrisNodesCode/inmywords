// Shared spec for the structured data fields a Note can carry. Used by the
// Notes surface (inputs + display) and the Projects surface (per-project
// template editor). Keep this the single source of truth for field keys/labels
// so the two stay in sync.

export type NoteFieldKey =
  | "amount"
  | "distance"
  | "rating"
  | "date"
  | "phone"
  | "email"
  | "url"
  | "address";

export type NoteFieldKind =
  | "currency"
  | "distance"
  | "rating"
  | "date"
  | "phone"
  | "email"
  | "url"
  | "text";

export type NoteFieldDef = {
  key: NoteFieldKey;
  label: string;
  icon: string;
  kind: NoteFieldKind;
};

// Order here is the order they appear in the toggle row and template editor.
export const NOTE_FIELDS: NoteFieldDef[] = [
  { key: "amount", label: "Amount", icon: "$", kind: "currency" },
  { key: "distance", label: "Distance", icon: "⇢", kind: "distance" },
  { key: "rating", label: "Rating", icon: "★", kind: "rating" },
  { key: "date", label: "Date", icon: "◷", kind: "date" },
  { key: "phone", label: "Phone", icon: "☎", kind: "phone" },
  { key: "email", label: "Email", icon: "@", kind: "email" },
  { key: "url", label: "Link", icon: "↗", kind: "url" },
  { key: "address", label: "Address", icon: "⌖", kind: "text" },
];

export const NOTE_FIELD_KEYS: NoteFieldKey[] = NOTE_FIELDS.map((f) => f.key);

export function isNoteFieldKey(v: unknown): v is NoteFieldKey {
  return typeof v === "string" && (NOTE_FIELD_KEYS as string[]).includes(v);
}

// Sanitize an arbitrary array into a de-duped list of valid field keys, in the
// canonical NOTE_FIELDS order. Used by both API validation and the UI.
export function cleanFieldKeys(value: unknown): NoteFieldKey[] {
  if (!Array.isArray(value)) return [];
  const set = new Set(value.filter(isNoteFieldKey));
  return NOTE_FIELD_KEYS.filter((k) => set.has(k));
}

// The structured values carried on a Note (as returned by the API; date is an
// ISO string over the wire).
export type NoteFieldValues = {
  amount: number | null;
  distance: number | null;
  rating: number | null;
  date: string | null;
  phone: string | null;
  email: string | null;
  url: string | null;
  address: string | null;
};

// Format a field's value for compact read-only display (feed card chips).
// Returns null when there's nothing to show.
export function formatNoteValue(key: NoteFieldKey, v: NoteFieldValues): string | null {
  switch (key) {
    case "amount": {
      if (v.amount == null) return null;
      const n = v.amount;
      const frac = Number.isInteger(n) ? 0 : 2;
      return `$${n.toLocaleString("en-US", {
        minimumFractionDigits: frac,
        maximumFractionDigits: 2,
      })}`;
    }
    case "distance":
      return v.distance == null ? null : `${v.distance} mi`;
    case "rating":
      if (v.rating == null) return null;
      return "★".repeat(v.rating) + "☆".repeat(Math.max(0, 5 - v.rating));
    case "date": {
      if (!v.date) return null;
      const d = new Date(v.date);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    case "phone":
      return v.phone?.trim() || null;
    case "email":
      return v.email?.trim() || null;
    case "url":
      return v.url?.trim() || null;
    case "address":
      return v.address?.trim() || null;
    default:
      return null;
  }
}

export function normalizeUrl(u: string): string {
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

// ── Custom fields (per-project) ──────────────────────────────────────────────
// Each project may define up to 3 custom fields, stored as defs on the Project
// (label + type per slot) with values living on each Note (customValues JSON,
// keyed by slot). Slots are stable so values survive label/type renames.

export const CUSTOM_FIELD_SLOTS = ["c1", "c2", "c3"] as const;
export type CustomSlot = (typeof CUSTOM_FIELD_SLOTS)[number];
export const MAX_CUSTOM_FIELDS = CUSTOM_FIELD_SLOTS.length;

export type CustomFieldType = "text" | "number" | "currency" | "boolean";
export const CUSTOM_FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "boolean", label: "Yes / No" },
];
export function isCustomFieldType(v: unknown): v is CustomFieldType {
  return v === "text" || v === "number" || v === "currency" || v === "boolean";
}

export type CustomFieldDef = { key: CustomSlot; label: string; type: CustomFieldType };
export type CustomValues = Record<string, string | number | boolean | null>;

// Validate/normalize an arbitrary value into a clean list of custom field defs
// (drops blanks, caps at MAX, dedupes slots, keeps slot order).
export function cleanCustomFields(value: unknown): CustomFieldDef[] {
  if (!Array.isArray(value)) return [];
  const bySlot = new Map<CustomSlot, CustomFieldDef>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const key = r.key;
    const label = typeof r.label === "string" ? r.label.trim() : "";
    const type = r.type;
    if (
      typeof key === "string" &&
      (CUSTOM_FIELD_SLOTS as readonly string[]).includes(key) &&
      label &&
      isCustomFieldType(type)
    ) {
      bySlot.set(key as CustomSlot, { key: key as CustomSlot, label, type });
    }
  }
  return CUSTOM_FIELD_SLOTS.filter((s) => bySlot.has(s)).map((s) => bySlot.get(s)!);
}

// Sanitize a Note's customValues to only the known slots, coercing by the
// project's field types. Returns a plain object suitable for storage.
export function cleanCustomValues(
  value: unknown,
  defs: CustomFieldDef[]
): CustomValues {
  const out: CustomValues = {};
  const src = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  for (const def of defs) {
    const raw = src[def.key];
    if (raw === undefined || raw === null || raw === "") continue;
    if (def.type === "boolean") {
      out[def.key] = raw === true || raw === "true";
    } else if (def.type === "number" || def.type === "currency") {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (Number.isFinite(n)) out[def.key] = n;
    } else {
      out[def.key] = String(raw);
    }
  }
  return out;
}

export function formatCustomValue(def: CustomFieldDef, raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  switch (def.type) {
    case "currency": {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) return null;
      const frac = Number.isInteger(n) ? 0 : 2;
      return `$${n.toLocaleString("en-US", { minimumFractionDigits: frac, maximumFractionDigits: 2 })}`;
    }
    case "number": {
      const n = typeof raw === "number" ? raw : Number(raw);
      return Number.isFinite(n) ? n.toLocaleString("en-US") : null;
    }
    case "boolean":
      return raw === true || raw === "true" ? "Yes" : "No";
    default:
      return String(raw).trim() || null;
  }
}

// ── Combined field spec (built-in + a project's custom) ───────────────────────
// Used by the Compare tab and editor to enumerate every comparable/displayable
// field for a given project.

export type CompareField = {
  key: string; // built-in NoteFieldKey or custom slot (c1/c2/c3)
  label: string;
  custom: boolean;
  // for sorting: numeric kinds sort numerically
  numeric: boolean;
};

const BUILTIN_NUMERIC: Record<NoteFieldKey, boolean> = {
  amount: true,
  distance: true,
  rating: true,
  date: true,
  phone: false,
  email: false,
  url: false,
  address: false,
};

export function compareFieldsForProject(customs: CustomFieldDef[]): CompareField[] {
  const builtin: CompareField[] = NOTE_FIELDS.map((f) => ({
    key: f.key,
    label: f.label,
    custom: false,
    numeric: BUILTIN_NUMERIC[f.key],
  }));
  const custom: CompareField[] = customs.map((c) => ({
    key: c.key,
    label: c.label,
    custom: true,
    numeric: c.type === "number" || c.type === "currency",
  }));
  return [...builtin, ...custom];
}

// Saved compare config shape.
export type CompareConfig = {
  fields: string[];
  sortBy: string | null;
  sortDir: "asc" | "desc";
};

export function cleanCompareConfig(value: unknown, valid: Set<string>): CompareConfig {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const fields = Array.isArray(v.fields)
    ? v.fields.filter((f): f is string => typeof f === "string" && valid.has(f))
    : [];
  const sortBy = typeof v.sortBy === "string" && valid.has(v.sortBy) ? v.sortBy : null;
  const sortDir = v.sortDir === "desc" ? "desc" : "asc";
  return { fields, sortBy, sortDir };
}
