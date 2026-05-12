console.log("omitted:", (1234).toPrecision());
console.log("fixed:", (1234).toPrecision(6));
console.log("exp:", (1234).toPrecision(2));
console.log("small:", (0.0001234).toPrecision(2));
console.log("rounded:", (12.5).toPrecision(2));
console.log("zero:", (0).toPrecision(3));

const dynamicNumber: any = 9.99;
console.log("dynamic:", dynamicNumber.toPrecision(2));
console.log("dynamic omitted:", dynamicNumber.toPrecision());
