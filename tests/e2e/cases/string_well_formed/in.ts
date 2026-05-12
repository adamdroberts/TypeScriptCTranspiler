const text = "A" + String.fromCodePoint(0x1f600);
console.log("well", text.isWellFormed());
console.log("same", text.toWellFormed().codePointAt(1));
