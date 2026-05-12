let a: any = "5";
console.log("post inc:", a++, a, typeof a);

let b: any = true;
console.log("pre inc:", ++b, b, typeof b);

let c: any = "x";
console.log("bad inc:", c++, String(c));

let d: any = 2;
console.log("pre dec:", --d, d);

let e: any = 2;
console.log("post dec:", e--, e);

const obj: any = { n: "1", m: 4 };
console.log("prop post:", obj.n++, obj.n, typeof obj.n);
console.log("prop pre:", --obj.m, obj.m, typeof obj.m);

const arr: any = [10, "7"];
console.log("idx post:", arr[0]--, arr[0]);
console.log("idx pre:", ++arr[1], arr[1], typeof arr[1]);

let key: any = "p";
const keyed: any = { p: "2" };
console.log("keyed:", keyed[key]++, keyed.p, typeof keyed.p);
