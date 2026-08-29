// Generate some deterministic dummy data
const inventory = Array.from({ length: 20000 }, (_, i) => ({
  id: `item-${i}`,
  name: `Product ${i}`,
  price: (i % 100) + 0.99,
}));

export function matchItems(itemIds: string[]) {
  const results = [];
  for (const reqId of itemIds) {
    for (let i = 0; i < 20; i++) {
      for (const item of inventory) {
        if (new RegExp(`^${reqId}$`).test(item.id)) {
          results.push(item);
        }
      }
    }
  }
  return results;
}
