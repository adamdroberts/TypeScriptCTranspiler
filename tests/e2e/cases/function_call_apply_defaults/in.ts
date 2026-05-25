function show(this: any, first?: any, second?: any): string {
    return this.tag + ":" + String(first) + ":" + String(second);
}

function mark(label: string): string {
    console.log("ignored:", label);
    return label;
}

const fn: any = show;

console.log("call args:", fn.call({ tag: "call" }, "x", "y"));
console.log("apply args:", fn.apply({ tag: "apply" }, ["x", "y"]));
console.log("apply extra:", fn.apply({ tag: "extra" }, ["x", "y"], mark("apply-extra")));
console.log("typed apply extra:", show.apply({ tag: "typed" }, ["a", "b"], mark("typed-extra")));
console.log("apply omitted:", fn.apply({ tag: "omitted" }));
console.log("apply undefined:", fn.apply({ tag: "undefined" }, undefined));
console.log("apply null:", fn.apply({ tag: "null" }, null));
