const fixed = new Date(1234);
const later = new Date(fixed.valueOf() + 66);
const now = new Date();

console.log("fixed:", fixed.getTime(), fixed.valueOf(), fixed.toString(), fixed.toLocaleString(), String(fixed));
console.log("later:", later.getTime());
console.log("now:", now.getTime() > 0, typeof now);
