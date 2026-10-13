const value: any = JSON.parse('{"nested":{"body":"109;"},"body":"discarded","body":"113;"}', function(key: string, value: any, context: any): any { return value; });
console.log("nested:", eval(value.nested.body));
console.log("duplicate:", eval(value.body));
let body: any = "127;";
JSON.parse('{"first":19e0,"last":"\\u0031"}', function(key: string, value: any, context: any): any { if (context.source !== undefined) body = context.source; return value; });
console.log("token:", eval(body));
const changed: any = JSON.parse('{"a":0,"b":"131;"}', function(this: any, key: string, value: any): any { if (key === "a") this.b = "137;"; return value; });
console.log("changed:", eval(changed.b));
function forward(value: string): string { const local = value; return local; }
console.log("formals:", eval(forward("139;")), eval(forward("149;")));
