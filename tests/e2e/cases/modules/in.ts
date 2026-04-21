import { add, multiply } from "./math";
import { Greeter } from "./greeter";

const sum = add(7, 3);
const prod = multiply(sum, 2);
console.log("add:", sum, "multiply:", prod);

const g = new Greeter("TypeScriptC");
console.log(g.greet());
console.log(g.shout());
