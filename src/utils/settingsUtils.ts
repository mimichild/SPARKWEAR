/** Move a tab one position up (towards index 0). Returns a new array. */
export function moveTabUp(order: string[], index: number): string[] {
  if (index <= 0 || index >= order.length) return [...order];
  const next = [...order];
  [next[index - 1], next[index]] = [next[index], next[index - 1]];
  return next;
}

/** Move a tab one position down (towards the end). Returns a new array. */
export function moveTabDown(order: string[], index: number): string[] {
  if (index < 0 || index >= order.length - 1) return [...order];
  const next = [...order];
  [next[index], next[index + 1]] = [next[index + 1], next[index]];
  return next;
}

/**
 * Toggle a tab's enabled state. At least one tab must remain enabled — if the
 * caller attempts to disable the only remaining tab, the input is returned
 * unchanged.
 */
export function toggleTab(enabled: string[], tab: string): string[] {
  if (enabled.includes(tab)) {
    if (enabled.length <= 1) return [...enabled];
    return enabled.filter(t => t !== tab);
  }
  return [...enabled, tab];
}

/** Format a byte count to a human-readable string (e.g. "12.3 MB"). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}
