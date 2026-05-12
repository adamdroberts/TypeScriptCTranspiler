const text: any = "one fish two fish";

console.log("match:", text.replace("fish", "<$&>"));
console.log("all:", text.replaceAll("fish", "$$&"));
console.log("prefix:", text.replace("two", "$`"));
