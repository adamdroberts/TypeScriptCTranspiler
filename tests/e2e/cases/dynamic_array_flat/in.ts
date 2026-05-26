const nested: any = [1, [2, [3, 4]], 5];

console.log("flat1:", nested.flat().join("|"));
console.log("flat2:", nested.flat(2).join("|"));
console.log("flat0:", nested.flat(0).join("|"));
console.log("flat null:", nested.flat(null).join("|"));
console.log("original:", nested.join("|"));
