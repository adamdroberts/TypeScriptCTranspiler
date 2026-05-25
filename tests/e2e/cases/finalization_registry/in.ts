class Box {
    value: number;
    constructor(value: number) {
        this.value = value;
    }
}

let cleaned = 0;
let trace = "";
const registry = new FinalizationRegistry<string>((heldValue) => {
    cleaned += heldValue.length;
});

function mark(label: string): string {
    trace += label;
    return label;
}

const a = new Box(1);
const b = new Box(2);
const c = new Box(3);
const tokenA = new Box(-1);
const tokenB = new Box(-2);

registry.register(a, "a");
registry.register(b, "b", tokenA);
registry.register(c, "c", tokenB);
registry.register(a, "a-again", tokenA);
registry.register(new Box(4), mark("h"), new Box(-4), mark("x"));
registry.register(new Box(5), mark("n"), undefined, mark("z"));

console.log("unreg-known:", registry.unregister(tokenA, mark("u")));
console.log("unreg-other:", registry.unregister(tokenB));
console.log("unreg-missing:", registry.unregister(new Box(99)));
console.log("text:", "" + registry);
console.log("self:", registry.valueOf() === registry);
console.log("cleaned:", cleaned);
console.log("ignored:", trace);
