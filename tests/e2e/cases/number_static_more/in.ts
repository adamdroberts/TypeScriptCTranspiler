console.log("safe max:", Number.isSafeInteger(9007199254740991));
console.log("safe next:", Number.isSafeInteger(9007199254740992));
console.log("safe frac:", Number.isSafeInteger(1.5));
console.log("safe inf:", Number.isSafeInteger(Infinity));
console.log("finite any:", Number.isFinite("1"), Number.isFinite(1), Number.isFinite(Infinity));
console.log("nan any:", Number.isNaN("NaN"), Number.isNaN(NaN));
console.log("integer any:", Number.isInteger("1"), Number.isInteger(1));
const dynamicNumber: any = JSON.parse("3");
const dynamicString: any = JSON.parse("\"3\"");
console.log("dynamic any:", Number.isFinite(dynamicNumber), Number.isFinite(dynamicString), Number.isInteger(dynamicNumber), Number.isSafeInteger(dynamicNumber));
console.log("parse bin:", Number.parseInt("101", 2));
console.log("parse hex:", Number.parseInt("ff", 16));
console.log("parse inferred:", parseInt("0x10"), parseInt("077"), Number.parseInt("0x20", 0));
console.log("parse invalid radix:", Number.parseInt("10", 1));
console.log("parse any:", parseInt(12.9), parseFloat(12.5), Number.parseInt(dynamicNumber), Number.parseFloat(dynamicNumber));
let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}
console.log("parse ignored:", parseInt("10", 10, mark("i")), Number.parseInt("11", 10, mark("j")), parseFloat("4.5px", mark("f")), Number.parseFloat(dynamicString, mark("n")), seen);
