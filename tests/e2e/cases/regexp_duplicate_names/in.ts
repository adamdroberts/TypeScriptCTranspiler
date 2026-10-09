const re = /(?<part>a)|(?<part>b)/dg;
for (const source of ["a", "b"]) {
    re.lastIndex = 0;
    const hit = re.exec(source)!;
    const position = source === "a" ? 1 : 2;
    console.log("capture:", hit.join("|"), hit.groups!.part, hit.indices!.groups!.part === hit.indices![position]);
}
const repeated = /(?:(?:(?<part>a)|(?<part>b))\k<part>){2}/d;
const hit = repeated.exec("aabb")!;
console.log("repeated:", hit.join("|"), hit.groups!.part, hit.indices!.groups!.part!.join(","));
console.log("miss:", repeated.exec("abab") === null);
const ordered = /(?<y>a)(?<x>a)|(?<x>b)(?<y>b)/d;
console.log("order:", Object.keys(ordered.exec("aa")!.groups!).join("|"), Object.keys(ordered.exec("bb")!.groups!).join("|"));
console.log("replace:", "ab".replace(/(?<part>a)|(?<part>b)/g, "[$<part>]"));
console.log("cleared:", /^(?:(?<part>x)|(?<part>y)|z){2}\k<part>$/.exec("xz")!.groups!.part === undefined);
console.log("forward:", /\k<part>(?:(?<part>a)|(?<part>b))/.exec("b")!.groups!.part);
