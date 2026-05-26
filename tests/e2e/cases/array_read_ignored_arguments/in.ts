let tick = 0;
function mark(label: string): number {
    tick++;
    console.log(label + ":" + tick);
    return 99;
}

const nums = [1, 2, 3, 2];
const nested = [[1], [2]];
const ro: ReadonlyArray<number> = nums;

console.log("typed index:" + nums.indexOf(2, 1, mark("typed-index-extra")));
console.log("typed last:" + nums.lastIndexOf(2, 3, mark("typed-last-extra")));
console.log("typed includes:" + ro.includes(3, 0, mark("typed-includes-extra")));
console.log("typed index undefined:" + nums.indexOf(2, undefined, mark("typed-index-undefined-extra")));
console.log("typed last undefined:" + nums.lastIndexOf(2, undefined, mark("typed-last-undefined-extra")));
console.log("typed includes undefined:" + ro.includes(1, undefined, mark("typed-includes-undefined-extra")));
console.log("typed at:" + nums.at(-1, mark("typed-at-extra")));
console.log("typed slice:" + nums.slice(1, 3, mark("typed-slice-extra")).join(","));
console.log("typed slice undefined:" + nums.slice(undefined, undefined, mark("typed-slice-undefined-extra")).join(","));
console.log("typed join:" + nums.join("-", mark("typed-join-extra")));
console.log("typed join undefined:" + nums.join(undefined, mark("typed-join-undefined-extra")));
console.log("typed flat:" + nested.flat(1, mark("typed-flat-extra")).join(","));
console.log("typed flat undefined:" + nested.flat(undefined, mark("typed-flat-undefined-extra")).join(","));

const dyn: any = [1, 2, 3, 2];
const dynNested: any = [[1], [2]];

console.log("dynamic index:" + dyn.indexOf(2, 1, mark("dynamic-index-extra")));
console.log("dynamic last:" + dyn.lastIndexOf(2, 3, mark("dynamic-last-extra")));
console.log("dynamic includes:" + dyn.includes(3, 0, mark("dynamic-includes-extra")));
console.log("dynamic at:" + dyn.at(-1, mark("dynamic-at-extra")));
console.log("dynamic slice:" + dyn.slice(1, 3, mark("dynamic-slice-extra")).join(","));
console.log("dynamic join:" + dyn.join("-", mark("dynamic-join-extra")));
console.log("dynamic join undefined:" + dyn.join(undefined, mark("dynamic-join-undefined-extra")));
console.log("dynamic join null:" + dyn.join(null, mark("dynamic-join-null-extra")));
console.log("dynamic flat:" + dynNested.flat(1, mark("dynamic-flat-extra")).join(","));
