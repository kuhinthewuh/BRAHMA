const inventory = Array.from({ length: 20000 }, (_, i) => ({ id: `item-${i}`, name: `Product ${i}`, price: (i % 100) + 0.99 }));
export function matchItems(itemIds: string[]) {
  const results = [];
  const map = new Map(inventory.map(i => [i.id, i]));
  for (const reqId of itemIds) {
    if (map.has(reqId)) results.push(map.get(reqId));
  }
  return results;
}