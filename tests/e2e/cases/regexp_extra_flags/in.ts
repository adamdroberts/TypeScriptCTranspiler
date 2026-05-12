const re = /cat/dy;

console.log("flags:", re.flags);
console.log("props:", re.hasIndices, re.sticky, re.global, re.unicode);

const plain = /dog/;
console.log("plain:", plain.hasIndices, plain.sticky);
