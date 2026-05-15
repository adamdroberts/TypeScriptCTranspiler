const json: any = Buffer.from([1, 2, 255]).toJSON();

console.log("shape:", json.type, json.data.length);
console.log("data:", json.data[0], json.data[1], json.data[2]);
