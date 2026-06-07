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
