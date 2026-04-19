// Phase 10-10 — synthetic entry-hub fixture (low fan-out, high fan-in).
// Triggers AntiPatternClassifier 'entry-hub' rule: fan-in >= 10 AND fan-out <= 2.
// 10 importer files in this directory pull `hub`; the file itself imports nothing.
export function hubLand(): string { return 'arrived at hub'; }
export const HUB_VERSION = 1;
