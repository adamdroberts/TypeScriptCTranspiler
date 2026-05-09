let joined = "";
let count = 0;

for (const ch of "Aé🙂B") {
    joined = joined + "[" + ch + "]";
    count++;
}

console.log(joined);
console.log(count);
