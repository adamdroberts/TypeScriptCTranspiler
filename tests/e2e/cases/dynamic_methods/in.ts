const text: any = " Ada Lovelace ";
let seen = "";
function mark(label: string): string {
  seen += label;
  return label;
}

console.log("upper:", text.trim(mark("t")).toUpperCase(mark("u")));
console.log("lower:", text.toLowerCase(mark("l")).trim(mark("r")));
console.log("cases:", "[" + text.toUpperCase().trim() + "]", "[" + text.toLowerCase().trim() + "]", "\u00e9".normalize("NFD").length);
console.log("wellformed:", "A".isWellFormed(), String.fromCharCode(0xd800).isWellFormed(), String.fromCharCode(0xd800).toWellFormed().charCodeAt(0), text.trim().isWellFormed());
console.log("string value:", text.toString().trim(), text.valueOf().trim(), Object(text).toString().trim());
console.log("raw:", String.raw`[${text.trim()}]`, String.raw({ raw: ["p", "q"] } as any));
console.log("iterator:", Array.from(text.trim()).join(""), text[Symbol.iterator]().next().value.charCodeAt(0));
console.log("ignored string:", seen);
console.log("char:", text.charAt(5));
console.log("includes:", text.includes("Love"));
console.log("starts:", text.trim().startsWith("Ada"));
console.log("ends:", text.trim().endsWith("lace"));
console.log("trims:", "[" + text.trimStart() + "]", "[" + text.trimEnd() + "]", "[" + text.trimLeft() + "]", "[" + text.trimRight() + "]");
console.log("index:", text.indexOf("Love"));
console.log("slice:", text.slice(5, 9));
console.log("repeat:", text.repeat(2).length, text.repeat(2).startsWith(" Ada"));
console.log("pads:", "[" + text.padStart(18, ".") + "]", "[" + text.padEnd(18, ".") + "]");

const values: any = [1, "two", 3];
console.log("join:", values.join("|"));
console.log("has two:", values.includes("two"));
console.log("idx three:", values.indexOf(3));
console.log("push len:", values.push("four"));
console.log("pop:", values.pop());
console.log("after:", values.join(","));
console.log("slice arr:", values.slice(1).join("/"));
values.reverse(mark("a"));
console.log("reverse:", values.join("-"));
console.log("ignored array:", seen);
console.log("locale:", text.toLocaleUpperCase().trim(), text.toLocaleLowerCase().trim());
console.log("locale ignored:", text.toLocaleUpperCase(mark("U")).trim(), seen);
