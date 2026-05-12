const text = "red fish red fish";

console.log("match:", text.replace("red", "[$&]"));
console.log("dollar:", text.replace("red", "$$"));
console.log("prefix-suffix:", text.replace("fish", "$`|$'"));
console.log("all:", text.replaceAll("red", "$&!"));
console.log("literal-capture:", text.replace("red", "$1"));
