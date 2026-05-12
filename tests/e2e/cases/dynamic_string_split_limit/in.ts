const text: any = "a,b,c,d";
const parts: any = text.split(",", 3);
console.log("string:", parts.join("|"), parts.length);

const chars: any = "abcd";
const letters: any = chars.split("", 2);
console.log("chars:", letters.join("-"), letters.length);

const words: any = "one  two   three";
const limited: any = words.split(/\s+/, 2);
console.log("regex:", limited.join("|"), limited.length);

const captureText: any = "a1b22c";
const captures: any = captureText.split(/(\d+)/);
console.log("captures:", captures.join("|"), captures.length);

const limitedText: any = "a1b2c";
const limitedCaptures: any = limitedText.split(/(\d)/, 3);
console.log("limited captures:", limitedCaptures.join("|"), limitedCaptures.length);

const none: any = text.split(",", 0);
console.log("zero:", none.length);
