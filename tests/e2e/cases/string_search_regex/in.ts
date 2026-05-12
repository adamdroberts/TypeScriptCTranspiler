const text = "Ada Lovelace 1843";

console.log("letters:", text.search(/[A-Z][a-z]+/));
console.log("digits:", text.search(/\d+/));
console.log("missing:", text.search(/Byron/));
