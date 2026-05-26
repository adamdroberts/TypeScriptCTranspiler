function getter(): number {
    return 1;
}

function setter(_value: number): void {
}

const text: any = "abc";
const flag: any = true;

Object.prototype.__defineGetter__.call(1, "x", getter);
console.log("number getter: ok");
text.__defineSetter__("x", setter);
console.log("string setter: ok");
console.log("boolean lookup:", Object.prototype.__lookupGetter__.call(flag, "x"), flag.__lookupSetter__("x"));
try {
    Object.prototype.__defineGetter__.call(1, "x", 1);
    console.log("bad getter: ok");
} catch (e: any) {
    console.log("bad getter:", e);
}
