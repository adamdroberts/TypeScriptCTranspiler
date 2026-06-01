const arr: any = [1, 2, 3, 4];

const first: any = arr.splice(1, 2, "a", "b", "c");
console.log("first:", first.join(","), arr.join(","), arr.length);

const tail: any = arr.splice(-2);
console.log("tail:", tail.join(","), arr.join(","));

const insert: any = arr.splice(1, 0, 9);
console.log("insert:", insert.length, arr.join(","));

const none: any = arr.splice();
console.log("none:", none.length, arr.join(","));

const omittedDeleteCountArr: any = [0, 1, 2, 3];
const omittedDeleteCount: any = omittedDeleteCountArr.splice(1);
console.log("omit-delete:", omittedDeleteCount.join(","), omittedDeleteCountArr.join(","));

const undefinedDeleteCountArr: any = [0, 1, 2, 3];
const undefinedDeleteCount: any = undefinedDeleteCountArr.splice(1, undefined);
console.log("undefined-delete:", undefinedDeleteCount.length, undefinedDeleteCountArr.join(","));

const nullDeleteCountArr: any = [0, 1, 2, 3];
const nullDeleteCount: any = nullDeleteCountArr.splice(1, null);
console.log("null-delete:", nullDeleteCount.length, nullDeleteCountArr.join(","));
