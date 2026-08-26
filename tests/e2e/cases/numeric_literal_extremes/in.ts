console.log("overflow:", 10e10000 === Infinity);
console.log("underflow:", Object.is(1e-10000, 0));
console.log(
    "large hexadecimal:",
    0xffffffffffffffffffffffffffffffff === 3.402823669209385e38,
);
