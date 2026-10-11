const iterator = "ab ab".matchAll(/(?<part>a)b/dg);
const positions = iterator.map((match) => match.index).toArray();
console.log("positions:", positions.join(","));
const captures = "ab".matchAll(/(?<part>a)b/g).flatMap((match) => [match[0], match.groups?.part]).toArray();
console.log("captures:", captures.join(","));
console.log("complete:", iterator.next().done);
