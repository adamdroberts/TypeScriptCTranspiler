let calls = 0;

function mark(value: boolean): boolean {
    calls++;
    return value;
}

let a = false;
a &&= mark(true);
console.log("and-false:", a, calls);

let b = true;
b &&= mark(false);
console.log("and-true:", b, calls);

let c = true;
c ||= mark(false);
console.log("or-true:", c, calls);

let d = false;
d ||= mark(true);
console.log("or-false:", d, calls);

let s: string | undefined = undefined;
s ??= "fallback";
console.log("nullish-1:", s);
s ??= "other";
console.log("nullish-2:", s);

let v: any = 0;
v ||= 5;
console.log("dyn-or:", v);
v &&= 2;
console.log("dyn-and:", v);

let n: any = null;
n ??= 7;
console.log("dyn-nullish:", n);
