let result = "";

for (let index = 0; index < 4; index = index + 1) {
    if (index === 1) continue;
    result = result + index;
}

console.log("for-continue:", result);
