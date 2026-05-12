const text = "Ada 1843";

console.log("capture:", text.replace(/(\w+) (\d+)/, "$2:$1"));
console.log("match:", text.replace(/\d+/, "[$&]"));
console.log("dollar:", text.replace(/Ada/, "$$"));
console.log("prefix-suffix:", text.replace(/\d+/, "$`|$'"));
console.log("missing:", text.replace(/(Ada)/, "$2-$1"));
