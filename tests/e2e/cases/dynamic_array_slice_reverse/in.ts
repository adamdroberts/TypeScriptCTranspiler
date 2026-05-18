const values: any = ["a", "b", "c", "d"];
let seen = "";
function mark(label: string): string {
  seen += label;
  return label;
}

const mid: any = values.slice(1, 3);
console.log("mid:", mid.join("|"), values.join("|"));

const tail: any = values.slice(-2);
console.log("tail:", tail.join("|"));

const clipped: any = values.slice(-10, 2);
console.log("clipped:", clipped.join("|"));

const reversed: any = values.reverse(mark("r"));
console.log("reverse:", reversed.join("|"), values.join("|"), Object.is(reversed, values), seen);

const copyReverse: any = values.slice().reverse(mark("c"));
console.log("copy reverse:", copyReverse.join("|"), values.join("|"), seen);
