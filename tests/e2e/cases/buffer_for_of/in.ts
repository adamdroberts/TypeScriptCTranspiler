const bytes = Buffer.from([13, 14, 255]);
const values: number[] = [];
for (const byte of bytes) {
    values.push(byte);
}
console.log(values.join(","));
