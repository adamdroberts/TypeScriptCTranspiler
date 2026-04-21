const xs: number[] = [1, 2, 3, 4, 5];
console.log("len", xs.length);
let sum = 0;
for (const x of xs) {
    sum = sum + x;
}
console.log("sum", sum);

xs.push(6);
xs.push(7, 8);
console.log("after push", xs.length, xs[5], xs[6], xs[7]);

const popped = xs.pop();
console.log("popped", popped, "len", xs.length);

const names: string[] = ["alice", "bob", "carol"];
for (const n of names) {
    console.log("hello,", n);
}
