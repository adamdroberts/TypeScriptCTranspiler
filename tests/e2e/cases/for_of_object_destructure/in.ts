const rows: any[] = [
    { name: "a", score: 1, extra: "x" },
    { name: "b", score: undefined, extra: "y" },
];

let output = "";
for (const { name: label, score = 0, ...rest } of rows) {
    output += `${label}:${score}:${String(rest.extra)}:${String(rest.name)};`;
}

console.log("direct", output);
