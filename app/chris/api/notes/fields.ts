import { cleanFieldKeys } from "@/app/chris/_lib/noteFields";

// Translate a request body into validated Prisma data for a Note's structured
// fields. Only keys present in the body are included (so PATCH stays partial).
// Returns null if any present value is the wrong shape.

type NoteFieldData = {
  amount?: number | null;
  distance?: number | null;
  rating?: number | null;
  date?: Date | null;
  phone?: string | null;
  email?: string | null;
  url?: string | null;
  address?: string | null;
  enabledFields?: string[];
};

function parseNumber(v: unknown): number | null | false {
  if (v === null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : false;
  }
  return false;
}

function parseString(v: unknown): string | null | false {
  if (v === null) return null;
  if (typeof v !== "string") return false;
  const t = v.trim();
  return t === "" ? null : t;
}

export function buildNoteFieldData(body: Record<string, unknown>): NoteFieldData | null {
  const data: NoteFieldData = {};

  if ("amount" in body) {
    const v = parseNumber(body.amount);
    if (v === false) return null;
    data.amount = v;
  }
  if ("distance" in body) {
    const v = parseNumber(body.distance);
    if (v === false) return null;
    data.distance = v;
  }
  if ("rating" in body) {
    const v = parseNumber(body.rating);
    if (v === false) return null;
    if (v !== null && (!Number.isInteger(v) || v < 1 || v > 5)) return null;
    data.rating = v;
  }
  if ("date" in body) {
    const raw = body.date;
    if (raw === null || raw === "") {
      data.date = null;
    } else if (typeof raw === "string") {
      const d = new Date(raw.length <= 10 ? `${raw}T00:00:00.000Z` : raw);
      if (Number.isNaN(d.getTime())) return null;
      data.date = d;
    } else {
      return null;
    }
  }
  for (const key of ["phone", "email", "url", "address"] as const) {
    if (key in body) {
      const v = parseString(body[key]);
      if (v === false) return null;
      data[key] = v;
    }
  }
  if ("enabledFields" in body) {
    data.enabledFields = cleanFieldKeys(body.enabledFields);
  }

  return data;
}
