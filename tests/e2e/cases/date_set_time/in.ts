const source = new Date("2020-02-03T04:05:06.007Z");
const copy = new Date(source);
const next = Date.UTC(2021, 0, 2, 3, 4, 5, 6);
let seen = "";

function mark(label: string): number {
    seen += label;
    return 12345;
}

console.log("before:", source.toISOString(), copy.toISOString());
console.log("set:", source.setTime(next), source.toISOString());
console.log("set extra:", source.setTime(next, mark("t")), source.toISOString(), seen);
console.log("copy:", copy.toISOString());
console.log("nan:", Number.isNaN(source.setTime(NaN)), String(source));
