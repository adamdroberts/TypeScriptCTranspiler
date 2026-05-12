console.log("explicit:", (1234).toExponential(2));
console.log("zero:", (0).toExponential(3));
console.log("omitted:", (1234).toExponential());
console.log("rounded:", (12.5).toExponential(1));

const dynamicNumber: any = 12.5;
console.log("dynamic:", dynamicNumber.toExponential(1));
console.log("dynamic omitted:", dynamicNumber.toExponential());
