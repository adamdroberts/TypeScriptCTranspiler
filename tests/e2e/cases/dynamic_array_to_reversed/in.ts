const nums: any = [1, 2, 3];
let seen = "";
function mark(label: string): string {
  seen += label;
  return label;
}
const rev = nums.toReversed(mark("r"));

console.log("rev:", rev.join(","));
console.log("orig:", nums.join(","));
console.log("ignored:", seen);
