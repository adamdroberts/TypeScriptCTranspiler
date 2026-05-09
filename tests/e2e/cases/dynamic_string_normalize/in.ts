const decomposed: any = "e\u0301";
const composed: any = "\u00e9";

console.log("default:", decomposed.normalize() === composed);
console.log("nfd:", composed.normalize("NFD") === decomposed);
