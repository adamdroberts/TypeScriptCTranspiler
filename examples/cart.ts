// Shopping cart — classes + interfaces + Array.reduce/map/filter + template literals.

interface Item {
    name: string;
    price: number;
    qty: number;
}

class Cart {
    items: Item[];

    constructor() {
        this.items = [];
    }

    add(item: Item): void {
        this.items.push(item);
    }

    subtotal(): number {
        return this.items.reduce((acc, it) => acc + it.price * it.qty, 0);
    }

    withDiscount(percent: number): number {
        return this.subtotal() * (1 - percent / 100);
    }

    describe(): string {
        const lines = this.items.map((it) => `  - ${it.name} x${it.qty} @ ${it.price}`);
        return "Cart:\n" + lines.join("\n");
    }

    expensiveItems(threshold: number): Item[] {
        return this.items.filter((it) => it.price >= threshold);
    }
}

const cart = new Cart();
cart.add({ name: "Book",     price: 12.99, qty: 2 });
cart.add({ name: "Pen",      price: 1.5,   qty: 10 });
cart.add({ name: "Notebook", price: 5.25,  qty: 3 });
cart.add({ name: "Laptop",   price: 999,   qty: 1 });

console.log(cart.describe());
console.log(`subtotal: ${cart.subtotal()}`);
console.log(`with 10% off: ${cart.withDiscount(10)}`);

const big = cart.expensiveItems(10);
console.log(`items ≥ $10: ${big.length}`);
big.forEach((it) => console.log(`  ${it.name}`));
