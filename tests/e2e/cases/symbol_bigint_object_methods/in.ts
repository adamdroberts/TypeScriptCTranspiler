const sym = Symbol("id");
const same = sym.valueOf();
const big = 255n;

console.log("sym-locale:", sym.toLocaleString());
console.log("sym-value:", same === sym, same.description);
console.log("big-locale:", big.toLocaleString());
console.log("big-value:", big.valueOf() + 1n);
console.log("own:", sym.hasOwnProperty("description"), big.propertyIsEnumerable("toString"));
