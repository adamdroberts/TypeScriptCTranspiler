// Inventory analytics — Map, Set, every higher-order array method, object literals.

interface Product {
    sku: string;
    category: string;
    price: number;
}

const catalog: Product[] = [
    { sku: "A1", category: "electronics", price: 299 },
    { sku: "A2", category: "electronics", price: 599 },
    { sku: "B1", category: "books",       price: 12 },
    { sku: "B2", category: "books",       price: 18 },
    { sku: "C1", category: "food",        price: 5 },
    { sku: "A3", category: "electronics", price: 89 },
    { sku: "B3", category: "books",       price: 22 },
];

// Group-by-category via Map.
const countByCategory = new Map<string, number>();
for (const p of catalog) {
    countByCategory.set(p.category, (countByCategory.get(p.category) ?? 0) + 1);
}

// Unique SKUs via Set.
const skus = new Set<string>();
catalog.forEach((p) => skus.add(p.sku));

// reduce: most expensive item.
const mostExpensive = catalog.reduce(
    (best, cur) => cur.price > best.price ? cur : best,
    catalog[0],
);

// map + reduce: total inventory value.
const total = catalog.map((p) => p.price).reduce((a, b) => a + b, 0);

// filter: books only.
const books = catalog.filter((p) => p.category === "books");

// some / every.
const anyPremium = catalog.some((p) => p.price > 500);
const allAffordable = catalog.every((p) => p.price < 1000);

console.log("=== inventory analytics ===");
console.log(`total products: ${catalog.length}`);
console.log(`unique SKUs:    ${skus.size}`);
console.log("by category:");
countByCategory.keys().forEach((c) =>
    console.log(`  ${c.padEnd(12)} ${countByCategory.get(c)}`),
);
console.log(`most expensive: ${mostExpensive.sku} @ $${mostExpensive.price}`);
console.log(`total value:    $${total}`);
console.log(`books (${books.length}):`);
books.forEach((b) => console.log(`  ${b.sku} $${b.price}`));
console.log(`any item > $500? ${anyPremium}`);
console.log(`all items < $1000? ${allAffordable}`);
