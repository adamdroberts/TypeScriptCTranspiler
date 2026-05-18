const values: any = [2, 3];
let seen = "";
function mark(label: string): string {
  seen += label;
  return label;
}

console.log("unshift len:", values.unshift(0, 1));
console.log("after unshift:", values.join(","));
console.log("shift:", values.shift());
console.log("after shift:", values.join(","));
console.log("push len:", values.push(4, 5));
console.log("after push:", values.join(","));

const merged: any = values.concat([6, 7], "end");
console.log("merged:", merged.join("|"));
console.log("original:", values.join("|"));
console.log("empty concat:", values.concat().join("|"));
console.log("ignored mutators:", values.pop(mark("p")), values.shift(mark("s")), values.join("|"), seen);
