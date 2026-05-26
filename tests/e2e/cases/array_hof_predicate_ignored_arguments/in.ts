let tick = 0;
function mark(label: string): number {
    tick++;
    console.log(label + ":" + tick);
    return tick;
}

const nums = [1, 2, 3, 4];

console.log("typed findIndex:" + nums.findIndex((n) => n === 3, mark("typed-find-index-this"), mark("typed-find-index-extra")));
console.log("typed findLast:" + nums.findLast((n) => n < 4, mark("typed-find-last-this"), mark("typed-find-last-extra")));
console.log("typed findLastIndex:" + nums.findLastIndex((n) => n < 4, mark("typed-find-last-index-this"), mark("typed-find-last-index-extra")));
console.log("typed every:" + nums.every((n) => n > 0, mark("typed-every-this"), mark("typed-every-extra")));

const ro: ReadonlyArray<number> = nums;
console.log("readonly findLastIndex:" + ro.findLastIndex((n) => n % 2 === 0, mark("readonly-find-last-index-this"), mark("readonly-find-last-index-extra")));

const dyn: any = [1, 2, 3, 4];
console.log("dynamic findIndex:" + dyn.findIndex((n: any) => n === 3, mark("dynamic-find-index-this"), mark("dynamic-find-index-extra")));
console.log("dynamic findLast:" + dyn.findLast((n: any) => n < 4, mark("dynamic-find-last-this"), mark("dynamic-find-last-extra")));
console.log("dynamic findLastIndex:" + dyn.findLastIndex((n: any) => n < 4, mark("dynamic-find-last-index-this"), mark("dynamic-find-last-index-extra")));
console.log("dynamic every:" + dyn.every((n: any) => n > 0, mark("dynamic-every-this"), mark("dynamic-every-extra")));
