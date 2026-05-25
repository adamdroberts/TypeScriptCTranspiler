let tick = 0;
function mark(label: string): number {
    tick++;
    console.log(label + ":" + tick);
    return tick;
}

const nums = [1, 2, 3];

let total = 0;
nums.forEach((n) => total += n, mark("typed-foreach-this"), mark("typed-foreach-extra"));
console.log("typed forEach:" + total);

console.log("typed map:" + nums.map((n) => n * 2, mark("typed-map-this"), mark("typed-map-extra")).join(","));
console.log("typed filter:" + nums.filter((n) => n > 1, mark("typed-filter-this"), mark("typed-filter-extra")).join(","));
console.log("typed some:" + nums.some((n) => n === 2, mark("typed-some-this"), mark("typed-some-extra")));
console.log("typed find:" + nums.find((n) => n > 1, mark("typed-find-this"), mark("typed-find-extra")));

const ro: ReadonlyArray<number> = nums;
console.log("readonly map:" + ro.map((n) => n + 1, mark("readonly-map-this"), mark("readonly-map-extra")).join(","));

const dyn: any = [1, 2, 3];
let dynTotal = 0;
dyn.forEach((n: any) => dynTotal += Number(n), mark("dynamic-foreach-this"), mark("dynamic-foreach-extra"));
console.log("dynamic forEach:" + dynTotal);

console.log("dynamic map:" + dyn.map((n: any) => n * 2, mark("dynamic-map-this"), mark("dynamic-map-extra")).join(","));
console.log("dynamic filter:" + dyn.filter((n: any) => n > 1, mark("dynamic-filter-this"), mark("dynamic-filter-extra")).join(","));
console.log("dynamic some:" + dyn.some((n: any) => n === 2, mark("dynamic-some-this"), mark("dynamic-some-extra")));
console.log("dynamic find:" + dyn.find((n: any) => n > 1, mark("dynamic-find-this"), mark("dynamic-find-extra")));
