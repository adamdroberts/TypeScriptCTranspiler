const shifted: any = ["a", "b", "c"];
delete shifted[1];
const shiftedValue = shifted.shift();
console.log("shift:", shiftedValue, Object.keys(shifted).join("|"), Object.hasOwn(shifted, "0"), String(shifted[0]));

const unshifted: any = ["a", "b", "c"];
delete unshifted[1];
const unshiftedLength = unshifted.unshift("x");
console.log("unshift:", unshiftedLength, Object.keys(unshifted).join("|"), Object.hasOwn(unshifted, "2"), String(unshifted[2]));

const leadingHole: any = ["a", "b"];
delete leadingHole[0];
console.log("leading hole:", String(leadingHole.shift()), Object.keys(leadingHole).join("|"), leadingHole[0]);
