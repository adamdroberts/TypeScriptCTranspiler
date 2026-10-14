function wrap(value: any): any { return Object(value); }
const first: any = wrap("ab"), second: any = wrap("xyz");
const a: any = Object.getOwnPropertyDescriptors(first), b: any = Object.getOwnPropertyDescriptors(second);
console.log("indices:", first[2] === undefined, second[2], a["2"] === undefined, b["2"].value);
const owner: any = Object("a😀z");
console.log("utf16:", owner.length, owner[1].charCodeAt(0), owner[2].charCodeAt(0), owner[4] === undefined);
owner[4] = "added";
console.log("added:", owner[4], Object.getOwnPropertyDescriptor(owner, "4").value);
const inherited: any = Object("x");
Object.defineProperty(String.prototype, "5", {value: "inherited", configurable: true});
console.log("inherited:", inherited[5], Object.getOwnPropertyDescriptor(inherited, "5") === undefined);
delete (String.prototype as any)[5];
