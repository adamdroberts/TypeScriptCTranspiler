let current = 4;

function readScore(): number {
    return current;
}

const obj: any = JSON.parse("{\"a\":1,\"b\":\"two\"}");

Object.defineProperty(obj, "hidden", {
    value: 99,
    enumerable: false,
});
Object.defineProperty(obj, "score", {
    get: readScore,
    enumerable: true,
});

const entries: any = Object.entries(obj);

console.log("len:", entries.length);
console.log("first:", entries[0].join("="));
console.log("second:", entries[1].join("="));
console.log("third:", entries[2].join("="));

current = 8;
const fresh: any = Object.entries(obj);
console.log("fresh:", fresh[2].join("="));
