// A read of x inside the taken branch of `x === literal` is that literal,
// unless something the analysis cannot see may change x in between.
function sameValue(a: any, b: any): boolean {
    if (a === 0 && b === 0) return 1 / a === 1 / b;
    if (a !== a && b !== b) return true;
    return a === b;
}
let conversions = 0;
const tricky = { valueOf() { conversions++; return 0; } };
console.log(sameValue(0, 0), sameValue(0, -0), sameValue(-0, -0), sameValue(NaN, NaN), sameValue(tricky, 0), conversions);

function reassigned(x: any): any {
    let y = x;
    if (y === 1) { y = "changed"; return y; }
    return y;
}
console.log(reassigned(1), reassigned(2));

function sloppyAlias(p: any): any {
    if (p === 1) { (arguments as any)[0] = 5; return p; }
    return p;
}
console.log(sloppyAlias(1), sloppyAlias(3));

const label = "on";
function pick(mode: string): string { return mode === "on" ? mode + "!" : mode; }
console.log(pick(label), pick("off"));
