let tick = 0;
function mark(label: string): number {
    tick++;
    console.log(label + ":" + tick);
    return 99;
}

const fillNums = [0, 0, 0];
console.log("typed fill:" + fillNums.fill(7, 1, 3, mark("typed-fill-extra")).join(","));
const fillUndefinedNums = [0, 0, 0];
console.log("typed fill undefined:" + fillUndefinedNums.fill(5, undefined, undefined, mark("typed-fill-undefined-extra")).join(","));

const copyNums = [1, 2, 3, 4];
console.log("typed copy:" + copyNums.copyWithin(1, 2, 4, mark("typed-copy-extra")).join(","));
const copyUndefinedNums = [1, 2, 3];
console.log("typed copy undefined:" + copyUndefinedNums.copyWithin(0, 1, undefined, mark("typed-copy-undefined-extra")).join(","));

const withNums = [1, 2, 3];
console.log("typed with:" + withNums.with(1, 9, mark("typed-with-extra")).join(","));
console.log("typed original:" + withNums.join(","));

const ro: ReadonlyArray<number> = withNums;
console.log("readonly with:" + ro.with(0, 5, mark("readonly-with-extra")).join(","));

const dynFill: any = [0, 0, 0];
console.log("dynamic fill:" + dynFill.fill(7, 1, 3, mark("dynamic-fill-extra")).join(","));

const dynCopy: any = [1, 2, 3, 4];
console.log("dynamic copy:" + dynCopy.copyWithin(1, 2, 4, mark("dynamic-copy-extra")).join(","));

const dynWith: any = [1, 2, 3];
console.log("dynamic with:" + dynWith.with(1, 9, mark("dynamic-with-extra")).join(","));
console.log("dynamic original:" + dynWith.join(","));
