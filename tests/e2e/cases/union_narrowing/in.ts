function describe(value: string | number): string {
    if (typeof value === "string") {
        return "string:" + value.length + ":" + value.toUpperCase();
    }
    return "number:" + (value + 2);
}

function describeNegated(value: string | number): string {
    if (typeof value !== "number") {
        return "not-number:" + value.length;
    }
    return "number:" + (value * 3);
}

let current: string | number = "abc";
console.log(describe("hi"));
console.log(describe(5));
console.log(describeNegated("word"));
console.log(describeNegated(4));

if (typeof current === "string") {
    console.log("current string:", current.length, current);
}
current = 9;
if (typeof current === "number") {
    console.log("current number:", current + 1);
}
