const rows: any = [
    [1, 2, 3],
    ["a", "b"],
    [],
];

for (const [first, ...rest] of rows) {
    console.log("row:", String(first), rest.join("|"), rest.length);
}

let total = 0;
for (let [, ...tail] of rows) {
    total += tail.length;
}
console.log("total:", total);
