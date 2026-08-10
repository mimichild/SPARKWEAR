import { getNeighborIds } from '../../utils/itemNav';

describe('getNeighborIds', () => {
  it('回傳前一筆與後一筆 id', () => {
    expect(getNeighborIds(['a', 'b', 'c'], 'b')).toEqual({ prevId: 'a', nextId: 'c' });
  });

  it('第一筆沒有 prevId', () => {
    expect(getNeighborIds(['a', 'b', 'c'], 'a')).toEqual({ prevId: undefined, nextId: 'b' });
  });

  it('最後一筆沒有 nextId', () => {
    expect(getNeighborIds(['a', 'b', 'c'], 'c')).toEqual({ prevId: 'b', nextId: undefined });
  });

  it('只有一筆時 prevId/nextId 都沒有', () => {
    expect(getNeighborIds(['a'], 'a')).toEqual({ prevId: undefined, nextId: undefined });
  });

  it('currentId 不在清單中回傳空物件', () => {
    expect(getNeighborIds(['a', 'b', 'c'], 'z')).toEqual({});
  });

  it('空清單回傳空物件', () => {
    expect(getNeighborIds([], 'a')).toEqual({});
  });
});
