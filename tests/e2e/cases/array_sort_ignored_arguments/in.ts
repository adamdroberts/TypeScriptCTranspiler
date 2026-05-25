let tick = 0;
function mark(label: string): number {
    tick++;
    console.log(label + ":" + tick);
    return 99;
}

const typedDefault = [10, 2, 1];
console.log("typed sort default:" + typedDefault.sort(undefined, mark("typed-sort-default-extra")).join(","));

const typedCopyDefault = [10, 2, 1];
console.log("typed toSorted default:" + typedCopyDefault.toSorted(undefined, mark("typed-tosorted-default-extra")).join(","));
console.log("typed toSorted original:" + typedCopyDefault.join(","));

const typedCmp = [3, 1, 2];
console.log("typed sort cmp:" + typedCmp.sort((a, b) => a - b, mark("typed-sort-cmp-extra")).join(","));

const typedCopyCmp = [3, 1, 2];
console.log("typed toSorted cmp:" + typedCopyCmp.toSorted((a, b) => b - a, mark("typed-tosorted-cmp-extra")).join(","));
console.log("typed cmp original:" + typedCopyCmp.join(","));

const dynDefault: any = [10, 2, 1];
console.log("dynamic sort default:" + dynDefault.sort(undefined, mark("dynamic-sort-default-extra")).join(","));

const dynCopyDefault: any = [10, 2, 1];
console.log("dynamic toSorted default:" + dynCopyDefault.toSorted(undefined, mark("dynamic-tosorted-default-extra")).join(","));
console.log("dynamic toSorted original:" + dynCopyDefault.join(","));

const dynCmp: any = [3, 1, 2];
console.log("dynamic sort cmp:" + dynCmp.sort((a: any, b: any) => a - b, mark("dynamic-sort-cmp-extra")).join(","));

const dynCopyCmp: any = [3, 1, 2];
console.log("dynamic toSorted cmp:" + dynCopyCmp.toSorted((a: any, b: any) => b - a, mark("dynamic-tosorted-cmp-extra")).join(","));
console.log("dynamic cmp original:" + dynCopyCmp.join(","));
