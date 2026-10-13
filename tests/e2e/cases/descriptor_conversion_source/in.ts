let body = "197;";
const target: any = {};
Object.defineProperty(target, "x", { get enumerable() { body = "199;"; return true; }, get configurable() { body = "211;"; return true; }, value: 17 });
console.log("field effects:", eval(body), target.x);
try { Object.defineProperty({}, "x", { get enumerable() { throw "223;"; }, get configurable() { body = "227;"; return true; } }); } catch (source) { console.log("early throw:", eval(source)); }
console.log("retained:", eval(body));
