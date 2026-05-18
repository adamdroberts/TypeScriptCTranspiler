const text = Date();

console.log("call:", typeof text, text.includes("GMT"), text.length > 20);

const constructed = new Date(0);
console.log("new:", typeof constructed, constructed.toISOString());
