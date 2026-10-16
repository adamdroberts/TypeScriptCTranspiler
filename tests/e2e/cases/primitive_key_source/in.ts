const stable = { toString(): string { return "17;"; } };
const target = Object.create(null);
const key = String(Math.random());
target[key];
console.log(eval(stable.toString()));
console.log("primitive-key-complete");
