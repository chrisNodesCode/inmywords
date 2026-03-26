/**
 * InMyWords — theme.ts
 *
 * Single source of truth for:
 *   - Accent color palette (6 options)
 *   - Font options (4 options)
 *   - Category taxonomy (8 categories)
 *   - Category annotation colors (light + dark stops)
 *
 * These values mirror globals.css CSS custom properties.
 * Use this file in components, the userPreferences schema,
 * and anywhere a typed reference to theme values is needed.
 */

// ── Accent Colors ─────────────────────────────────────────────────────────────

export type AccentId = 'slate' | 'iris' | 'sage' | 'dusk' | 'sand' | 'storm'

export interface AccentColor {
  id:    AccentId
  name:  string
  // Light mode stops
  light: { main: string; fill: string; border: string; dark: string; deep: string }
  // Dark mode stops (lighter values shift to foreground)
  dark:  { main: string; fill: string; border: string; text: string }
}

export const ACCENT_COLORS: AccentColor[] = [
  {
    id: 'slate', name: 'slate',
    light: { main: '#5B7FA6', fill: '#E8EFF7', border: '#96B4D0', dark: '#2A4A6E', deep: '#1A3A5E' },
    dark:  { main: '#7AAACF', fill: '#162234', border: '#3A6A8E', text: '#A8CCDF' },
  },
  {
    id: 'iris', name: 'iris',
    light: { main: '#7F77DD', fill: '#EEEDFE', border: '#AFA9EC', dark: '#3C3489', deep: '#2C2470' },
    dark:  { main: '#9E98E8', fill: '#1A1630', border: '#5C56B0', text: '#C4BEEE' },
  },
  {
    id: 'sage', name: 'sage',
    light: { main: '#5A8F72', fill: '#EAF3E8', border: '#9FCF9F', dark: '#2D5A3D', deep: '#1D4030' },
    dark:  { main: '#6AB882', fill: '#102418', border: '#326A48', text: '#A4CCAF' },
  },
  {
    id: 'dusk', name: 'dusk',
    light: { main: '#A06880', fill: '#F5EAF0', border: '#D4A8BC', dark: '#6B3D52', deep: '#4A2538' },
    dark:  { main: '#C48AA0', fill: '#26101C', border: '#7A4060', text: '#DFBACB' },
  },
  {
    id: 'sand', name: 'sand',
    light: { main: '#A07848', fill: '#F5EDDF', border: '#D4B48C', dark: '#6B4A1E', deep: '#4A3010' },
    dark:  { main: '#C49A68', fill: '#241808', border: '#7A5028', text: '#DFBF9A' },
  },
  {
    id: 'storm', name: 'storm',
    light: { main: '#4A6078', fill: '#E8EDF2', border: '#8FA6B8', dark: '#253040', deep: '#152030' },
    dark:  { main: '#7A98B0', fill: '#101820', border: '#3A5870', text: '#ABBFCF' },
  },
]

export const DEFAULT_ACCENT: AccentId = 'slate'

// ── Font Options ──────────────────────────────────────────────────────────────

export type FontId = 'default' | 'noto' | 'pt' | 'open' | 'deju'

export interface FontOption {
  id:     FontId
  name:   string
  label:  string         // short label for sidebar chip
  family: string         // CSS font-family value
  isSerif: boolean
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'default', name: 'Default', label: 'default',
    family: '"IBM Plex Sans", Helvetica, sans-serif',
    isSerif: false,
  },
  {
    id: 'noto', name: 'Noto Serif', label: 'noto',
    family: '"Noto Serif", Georgia, serif',
    isSerif: true,
  },
  {
    id: 'pt', name: 'PT Serif', label: 'pt',
    family: '"PT Serif", Georgia, serif',
    isSerif: true,
  },
  {
    id: 'open', name: 'Open Sans', label: 'open',
    family: '"Open Sans", Arial, sans-serif',
    isSerif: false,
  },
  {
    id: 'deju', name: 'DejaVu Sans', label: 'deju',
    family: '"DejaVu Sans", Arial, sans-serif',
    isSerif: false,
  },
]

export const DEFAULT_FONT: FontId = 'default'

// ── Category Taxonomy ─────────────────────────────────────────────────────────

export type CategoryId =
  | 'masking'
  | 'scripting'
  | 'the-crash'
  | 'sensory-sensitivity'
  | 'task-paralysis'
  | 'rejection-sensitivity'
  | 'justice-sensitivity'
  | 'people-pleasing'
  | 'not-knowing-how-i-feel'
  | 'demand-avoidance'
  | 'stimming'
  | 'burnout'

export interface Category {
  id:    CategoryId
  label: string        // display label (lowercase)
  colors: {
    light: { color: string; bg: string }
    dark:  { color: string; bg: string }
  }
}

const NEUTRAL_COLORS = {
  light: { color: '#6B7585', bg: '#EEEEF2' },
  dark:  { color: '#9AA0AC', bg: '#1C1E24' },
}

export const CATEGORIES: Category[] = [
  { id: 'masking',                  label: 'masking',                   colors: NEUTRAL_COLORS },
  { id: 'scripting',                label: 'scripting',                 colors: NEUTRAL_COLORS },
  { id: 'the-crash',                label: 'the crash',                 colors: NEUTRAL_COLORS },
  { id: 'sensory-sensitivity',      label: 'sensory sensitivity',       colors: NEUTRAL_COLORS },
  { id: 'task-paralysis',           label: 'task paralysis',            colors: NEUTRAL_COLORS },
  { id: 'rejection-sensitivity',    label: 'rejection sensitivity',     colors: NEUTRAL_COLORS },
  { id: 'justice-sensitivity',      label: 'justice sensitivity',       colors: NEUTRAL_COLORS },
  { id: 'people-pleasing',          label: 'people pleasing',           colors: NEUTRAL_COLORS },
  { id: 'not-knowing-how-i-feel',   label: 'not knowing how I feel',    colors: NEUTRAL_COLORS },
  { id: 'demand-avoidance',         label: 'demand avoidance',          colors: NEUTRAL_COLORS },
  { id: 'stimming',                 label: 'stimming',                  colors: NEUTRAL_COLORS },
  { id: 'burnout',                  label: 'burnout',                   colors: NEUTRAL_COLORS },
]

// ── userPreferences defaults ───────────────────────────────────────────────────
// Mirror these in your Prisma schema default values

export const USER_PREFERENCE_DEFAULTS = {
  accent:   DEFAULT_ACCENT satisfies AccentId,
  font:     DEFAULT_FONT    satisfies FontId,
  darkMode: false,
  editorFontSize: 17,       // px
  editorLineWidth: 'mid',   // 'narrow' | 'mid' | 'wide'
} as const

export type LineWidth = 'narrow' | 'mid' | 'wide'

export const LINE_WIDTH_VALUES: Record<LineWidth, string> = {
  narrow: '480px',
  mid:    '640px',
  wide:   '820px',
}
