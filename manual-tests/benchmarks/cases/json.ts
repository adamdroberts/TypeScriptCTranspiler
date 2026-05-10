// JSON.stringify of a typed object containing a nested array.
// Outer 1000 × stringify a record with a 30-element array of structs.
const OUTER = 1000;
const N = 30;

interface Tag { key: string; value: number; }
interface Item { id: number; name: string; price: number; active: boolean; tags: Tag[]; }

const t0 = Date.now();
let total = 0;
for (let i = 0; i < OUTER; i++) {
    const tags: Tag[] = [];
    for (let j = 0; j < N; j++) {
        tags.push({ key: "k_" + j, value: j * i });
    }
    const item: Item = {
        id: i,
        name: "item_" + i,
        price: i * 1.5,
        active: (i % 2) === 0,
        tags: tags,
    };
    const s = JSON.stringify(item);
    total += s.length;
}
const t1 = Date.now();
console.log("BENCH:json:" + (t1 - t0) + ":" + total);
