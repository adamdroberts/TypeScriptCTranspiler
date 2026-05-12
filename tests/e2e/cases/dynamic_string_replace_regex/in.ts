const text: any = "a1 b22 c333";

console.log("replace:", text.replace(/\d+/, "X"));
console.log("all:", text.replaceAll(/\d/g, "Y"));
