const values: any = ["a", "b", "c", "d"];

const mid: any = values.slice(1, 3);
console.log("mid:", mid.join("|"), values.join("|"));

const tail: any = values.slice(-2);
console.log("tail:", tail.join("|"));

const clipped: any = values.slice(-10, 2);
console.log("clipped:", clipped.join("|"));

const reversed: any = values.reverse();
console.log("reverse:", reversed.join("|"), values.join("|"), Object.is(reversed, values));

const copyReverse: any = values.slice().reverse();
console.log("copy reverse:", copyReverse.join("|"), values.join("|"));
