const methods: any = Array.prototype;
let restricted = "17;";
try { methods.map.arguments; } catch (error) { restricted = "19;"; }
console.log(eval(restricted));
const owner: any = Object.create(methods.map);
owner.name = "23;";
console.log(eval(owner.name === "map" ? "29;" : "31;"));
let coercion = "37;";
try { methods.toString.call(null); } catch (error) { coercion = "41;"; }
console.log(eval(coercion));
let reflect = "43;";
try { Reflect.getPrototypeOf(17 as any); } catch (error) { reflect = "47;"; }
console.log(eval(reflect));
const generatorPrototype: any = Object.getPrototypeOf(function* () {});
console.log(eval(typeof generatorPrototype === "object" ? "53;" : "59;"));
console.log("complete");
