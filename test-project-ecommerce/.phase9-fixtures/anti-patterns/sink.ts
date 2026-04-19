// Phase 10-10 — synthetic utility-sink fixture (high fan-in, fan-out 0).
// Triggers AntiPatternClassifier 'utility-sink' rule: fan-in >= 8 AND fan-out === 0.
// The 10 importer-* files below each import sink so its fan-in goes to 10.
// This file imports nothing.
export function clamp(n: number, min: number, max: number): number { return Math.max(min, Math.min(max, n)); }
export const PI = 3.14159;
