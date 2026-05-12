interface Doc {
    a: number;
    b: number;
    c: number;
}

const map = new Map<string, number>();
map.set("a", 4);
map.set("b", 7);
map.set("c", 2);

const doc: Doc = Object.fromEntries<Doc>(map);
console.log("doc:", doc.a, doc.b, doc.c);

map.set("b", 9);
const updated: Doc = Object.fromEntries<Doc>(map);
console.log("updated:", updated.a, updated.b, updated.c);
