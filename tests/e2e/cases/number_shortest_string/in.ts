console.log(String(2 ** 63), String(1000000000000000128));
console.log((1e-6).toString(), (1e-7).toString(), (1e21).toString());
console.log(JSON.stringify([2 ** 63, 1e-6, 1e21]));
const huge = Number.MAX_VALUE.toString(2), tiny = Number.MIN_VALUE.toString(2);
console.log(huge.length, tiny.length, huge.endsWith("0"), tiny.endsWith("1"));
const numberWrapper: Number = new Number(2 ** 63);
const stringWrapper: String = new String("text");
const booleanWrapper: Boolean = new Boolean(true);
console.log(typeof numberWrapper, numberWrapper.toString(), stringWrapper.toString(), booleanWrapper.toString());
