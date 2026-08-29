export let incidentMode = false;

export function setIncidentMode(mode: boolean) {
  incidentMode = mode;
}

// Generate some deterministic dummy data
const inventory = Array.from({ length: 20000 }, (_, i) => ({
  id: `item-${i}`,
  name: `Product ${i}`,
  price: (i % 100) + 0.99,
}));

export function matchItems(itemIds: string[]) {
  if (incidentMode) {
    // Deliberate O(n^2) inefficient lookup that causes CPU spike
    const results = [];
    for (const reqId of itemIds) {
      // Intentional massive nested loop to simulate severe regression
      for (let i = 0; i < 20; i++) {
        for (const item of inventory) {
          // Unnecessary regex creation and matching in hot loop
          if (new RegExp(`^${reqId}$`).test(item.id)) {
            results.push(item);
          }
        }
      }
    }
    return results;
  } else {
    // Healthy O(1) Map lookup
    const inventoryMap = new Map(inventory.map(i => [i.id, i]));
    return itemIds.map(id => inventoryMap.get(id)).filter(Boolean);
  }
}
