const nums = [1, 2, 3];
const rev = nums.toReversed();

console.log("rev:", rev.join(","));
console.log("orig:", nums.join(","));

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

const ignored = nums.toReversed(mark("r"));
console.log("ignored:", ignored.join(","), seen);
