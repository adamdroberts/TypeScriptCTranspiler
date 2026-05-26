function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (err: any) {
        console.log(label + ":", err);
    }
}

let cleaned = 0;
let marks = "";
function mark(label: string): any {
    marks += label;
    return label;
}

const registry = new FinalizationRegistry<any>((held: any) => {
    cleaned += String(held).length;
});

const target: any = { name: "target" };
const token: any = { name: "token" };
const undef: any = undefined;
const bad: any = 1;
const nil: any = null;

registry.register(target, "held", token, mark("a"));
registry.register(target, "untokened", undef, mark("b"));
console.log("unregister:", registry.unregister(token, mark("c")), registry.unregister(token));
console.log("cleaned:", cleaned);
report("bad target", (): any => {
    registry.register(bad, "held");
    return "ok";
});
report("null target", (): any => {
    registry.register(nil, "held");
    return "ok";
});
report("bad token", (): any => {
    registry.register(target, "held", bad);
    return "ok";
});
report("unregister bad", (): any => registry.unregister(bad));
console.log("marks:", marks);
