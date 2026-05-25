interface Box {
    id: number;
}

let marks = "";

function mark(label: string): string {
    marks += label;
    return label;
}

const target: Box = { id: 7 };
const ref = new WeakRef<Box>(target, mark("a"), mark("b"));
const deref = ref.deref();
console.log("weak:", deref ? deref.id : 0);

const registry = new FinalizationRegistry<string>((held) => {
    marks += held;
}, mark("c"));
registry.register(target, "held", target);
console.log("registry:", registry.toString(), registry.unregister(target));
console.log("marks:", marks);
