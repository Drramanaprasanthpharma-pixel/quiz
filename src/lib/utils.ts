import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Generates a 6-character, human-friendly session PIN (no 0/O/1/I). */
export function generateSessionPin(): string {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let pin = "";
  for (let i = 0; i < 6; i++) {
    pin += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return pin;
}

export function buildJoinUrl(pin: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/join/${pin}`;
}

/** Local, per-browser participant identity for a session — no account needed. */
export interface StoredParticipant {
  participantId: string;
  participantToken: string;
  sessionId: string;
  nickname: string;
}

const PARTICIPANT_KEY_PREFIX = "buzzr:participant:";

export function storeParticipant(pin: string, data: StoredParticipant) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PARTICIPANT_KEY_PREFIX + pin, JSON.stringify(data));
}

export function getStoredParticipant(pin: string): StoredParticipant | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PARTICIPANT_KEY_PREFIX + pin);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredParticipant;
  } catch {
    return null;
  }
}

export function clearStoredParticipant(pin: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PARTICIPANT_KEY_PREFIX + pin);
}

export function formatPercent(numerator: number, denominator: number): string {
  if (denominator === 0) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

const ANSWER_SHAPES = ["triangle", "diamond", "circle", "square", "hexagon", "star"] as const;
export type AnswerShape = (typeof ANSWER_SHAPES)[number];

export function shapeForIndex(i: number): AnswerShape {
  return ANSWER_SHAPES[i % ANSWER_SHAPES.length]!;
}

const ANSWER_COLOR_CLASSES = [
  "bg-signal hover:bg-signal-dark",
  "bg-coral hover:bg-coral-dark",
  "bg-gold text-ink hover:bg-gold-dark",
  "bg-mint text-ink hover:bg-mint-dark",
  "bg-ink600 hover:bg-ink-soft",
  "bg-signal-dark hover:bg-ink-soft",
];

export function colorClassForIndex(i: number): string {
  return ANSWER_COLOR_CLASSES[i % ANSWER_COLOR_CLASSES.length]!;
}
