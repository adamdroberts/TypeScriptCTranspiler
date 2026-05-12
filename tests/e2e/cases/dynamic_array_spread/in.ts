const base: any = [1, "x"];
const copy: any = [0, ...base, true];
console.log("copy:", copy.join("|"), copy.length);

const text: any = "ab";
const chars: any = [...text, "z"];
console.log("chars:", chars.join(","), chars.length);

const typedText = "cd";
const typedChars: any = [...typedText];
console.log("typed chars:", typedChars.join(""), typedChars.length);

const typed = [2, 3];
const mixed: any = ["a", ...typed, "b"];
console.log("typed:", mixed.join(","), mixed.length);

base[0] = 9;
console.log("copy stable:", copy[1], base[0]);
