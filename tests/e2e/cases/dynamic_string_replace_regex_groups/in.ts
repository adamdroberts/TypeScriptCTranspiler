const text: any = "a1 b22";

console.log("capture:", text.replace(/([a-z])(\d+)/, "$2:$1"));
console.log("all:", text.replaceAll(/(\d)/g, "[$1]"));
console.log("match-dollar:", text.replace(/\d+/, "$& $$"));
