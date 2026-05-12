const mixed = String.fromCodePoint(65, 0x1f600, 0x2665);
console.log("points", mixed.codePointAt(0), mixed.codePointAt(1), mixed.codePointAt(3));
console.log("units", mixed.charCodeAt(1), mixed.charCodeAt(2));
console.log("empty", String.fromCodePoint().length);
