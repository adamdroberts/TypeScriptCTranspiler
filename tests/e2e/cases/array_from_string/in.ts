const chars = Array.from("A" + String.fromCodePoint(0x1f600));
console.log("chars", chars[0], chars[1].codePointAt(0), chars.length);
