const rawNum: any = "41";
const n: number = rawNum;
console.log("num:", n + 1);

const rawBool: any = 1;
const b: boolean = rawBool;
console.log("bool:", b ? "yes" : "no");

const rawString: any = 42;
const s: string = rawString;
console.log("string:", s + "!");

const rawArray: any = [1, "two"];
const values: any[] = rawArray;
values.push(3);
console.log("array len:", values.length);
console.log("array:", values.join("|"));
