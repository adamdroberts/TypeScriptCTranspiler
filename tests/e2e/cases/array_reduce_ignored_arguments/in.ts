let tick = 0;
function mark(label: string): number {
    tick++;
    console.log(label + ":" + tick);
    return tick;
}

const nums = [1, 2, 3];

console.log("typed reduce:" + nums.reduce((acc, n) => acc + n, 0, mark("typed-reduce-extra")));
console.log("typed reduceRight:" + nums.reduceRight((acc, n) => acc + String(n), "", mark("typed-reduceright-extra")));

const ro: ReadonlyArray<number> = nums;
console.log("readonly reduce:" + ro.reduce((acc, n) => acc + n, 10, mark("readonly-reduce-extra")));

const dyn: any = [1, 2, 3];
console.log("dynamic reduce:" + dyn.reduce((acc: any, n: any) => Number(acc) + Number(n), 0, mark("dynamic-reduce-extra")));
console.log("dynamic reduceRight:" + dyn.reduceRight((acc: any, n: any) => String(acc) + String(n), "", mark("dynamic-reduceright-extra")));
