let greeting = "hello";
greeting += ", ";
greeting += "world";
console.log(greeting);

let parts = "";
for (let i = 0; i < 4; i++) {
    if (parts.length > 0) parts += ",";
    parts += "" + i;
}
console.log(parts);

let summary = "[";
summary += 1;
summary += "/";
summary += 2;
summary += "]";
console.log(summary);
console.log("len:", greeting.length);
