const actual = new TypeError("typed");
const predicate = Error.isError;
console.log("brand:", predicate(actual), predicate({ name: "Error" }), predicate(Error.prototype));
console.log("inherited:", TypeError.isError === predicate, TypeError.isError(actual));
Object.setPrototypeOf(actual, null);
console.log("changed prototype:", predicate(actual));
const wrapped = new Proxy(actual, {});
const revoked = Proxy.revocable(actual, {});revoked.revoke();
console.log("proxies:", predicate(wrapped), predicate(revoked.proxy));
let effect = 0;
console.log("actuals:", predicate(), predicate(actual, effect++, effect++), effect);
class DerivedError extends Error {}
console.log("subclass:", predicate(new DerivedError()));
