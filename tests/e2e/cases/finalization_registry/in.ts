class Box {
    value: number;
    constructor(value: number) {
        this.value = value;
    }
}

let cleaned = 0;
const registry = new FinalizationRegistry<string>((heldValue) => {
    cleaned += heldValue.length;
});

const a = new Box(1);
const b = new Box(2);
const c = new Box(3);
const tokenA = new Box(-1);
const tokenB = new Box(-2);

registry.register(a, "a");
registry.register(b, "b", tokenA);
registry.register(c, "c", tokenB);
registry.register(a, "a-again", tokenA);

console.log("unreg-known:", registry.unregister(tokenA));
console.log("unreg-other:", registry.unregister(tokenB));
console.log("unreg-missing:", registry.unregister(new Box(99)));
console.log("text:", "" + registry);
console.log("self:", registry.valueOf() === registry);
console.log("cleaned:", cleaned);
