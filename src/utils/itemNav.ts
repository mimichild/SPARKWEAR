/**
 * Given the ordered id list a user was browsing and the id currently open,
 * find the previous/next id to swipe to. Returns undefined at either edge
 * or when currentId isn't part of ids (e.g. entered from an unrelated list).
 */
export function getNeighborIds(
  ids: string[],
  currentId: string
): { prevId?: string; nextId?: string } {
  const index = ids.indexOf(currentId);
  if (index === -1) return {};
  return {
    prevId: index > 0 ? ids[index - 1] : undefined,
    nextId: index < ids.length - 1 ? ids[index + 1] : undefined,
  };
}
