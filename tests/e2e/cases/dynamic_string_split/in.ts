const text: any = "a,b,c";
const parts: any = text.split(",");
console.log("parts:", parts.join("|"), parts.length, parts[1]);

const chars: any = text.split("");
console.log("chars:", chars.slice(0, 3).join("-"), chars.length);
