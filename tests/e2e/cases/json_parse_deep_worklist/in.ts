let source = "null";
for (let index = 0; index < 4096; index++) {
    source = `[${source}]`;
}

let value: any = JSON.parse(source);
let observedDepth = 0;
while (Array.isArray(value)) {
    observedDepth++;
    value = value[0];
}

console.log(observedDepth, value === null);
