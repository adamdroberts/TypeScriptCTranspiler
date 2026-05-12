interface Doc {
    a: number;
    b: number;
    c: number;
}

const m = new Map<string, number>();
m.set("a", 1);
m.set("b", 2);
m.set("c", 3);

const entries = m.entries();
console.log("len:", entries.length);
for (let i = 0; i < entries.length; i++) {
    const e = entries[i]!;
    console.log(e[0], "=", e[1]);
}

const back: Map<string, number> = new Map(m.entries());
console.log("size:", back.size);
console.log("a:", back.get("a"));
console.log("b:", back.get("b"));
console.log("c:", back.get("c"));

const doc: Doc = Object.fromEntries<Doc>(m.entries());
console.log("doc.a:", doc.a);
console.log("doc.b:", doc.b);
console.log("doc.c:", doc.c);
