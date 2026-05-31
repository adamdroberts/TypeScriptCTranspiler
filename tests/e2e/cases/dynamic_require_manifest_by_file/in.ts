import { loadA } from "./loader_a";
import { loadB } from "./nested/loader_b";

console.log("by-file first:", loadA().label);
console.log("by-file second:", loadB().label);
