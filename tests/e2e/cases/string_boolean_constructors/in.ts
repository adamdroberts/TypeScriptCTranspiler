console.log("string none:", String());
console.log("string num:", String(12.5));
console.log("string bool:", String(false));
console.log("string null:", String(null));
console.log("string undefined:", String(undefined));

const dynamicNumber: any = JSON.parse("7");
console.log("string dynamic:", String(dynamicNumber));

console.log("boolean values:", Boolean("x"), Boolean(""), Boolean(0), Boolean(3), Boolean(null));
const dynamicZero: any = JSON.parse("0");
console.log("boolean dynamic:", Boolean(dynamicZero));

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}
console.log("ignored:", String(mark("s"), mark("t")), Boolean("x", mark("b")), Boolean(0, mark("c")), seen);
