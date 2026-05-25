let tick = 0;
function mark(label: string): number {
    tick++;
    console.log(label + ":" + tick);
    return tick;
}

const nums = [1, 2, 3];
console.log("typed has:" + nums.hasOwnProperty("0", mark("typed-has-extra")));
console.log("typed enum:" + nums.propertyIsEnumerable("length", mark("typed-enum-extra")));

const dyn: any = [1, 2, 3];
console.log("dynamic has:" + dyn.hasOwnProperty("0", mark("dynamic-has-extra")));
console.log("dynamic enum:" + dyn.propertyIsEnumerable("length", mark("dynamic-enum-extra")));
