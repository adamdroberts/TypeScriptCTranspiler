function id<T>(value: T): T {
    return value;
}

function first<T>(values: T[]): T {
    return values[0];
}

const numId: (value: number) => number = id;
const strId: (value: string) => string = id;
const firstString: (values: string[]) => string = first;

console.log("num:", numId(8) + 1);
console.log("str:", strId("ok") + "!");
console.log("first:", firstString(["a", "b"]));
