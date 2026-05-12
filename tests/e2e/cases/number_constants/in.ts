console.log("epsilon:", Number.EPSILON > 0 && Number.EPSILON < 1);
console.log("safe:", Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER);
console.log("infinity:", Number.POSITIVE_INFINITY === Infinity, Number.NEGATIVE_INFINITY === -Infinity);
console.log("nan:", Number.isNaN(Number.NaN));
console.log("max:", Number.MAX_VALUE > 1e300);
console.log("min:", Number.MIN_VALUE > 0 && Number.MIN_VALUE < 1e-300);
