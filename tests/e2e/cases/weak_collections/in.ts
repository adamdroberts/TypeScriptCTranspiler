interface User {
    name: string;
}

class Token {
    id: number;
    constructor(id: number) {
        this.id = id;
    }
}

const alice: User = { name: "alice" };
const bob: User = { name: "bob" };

const names = new WeakMap<User, string>();
console.log("set:", names.set(alice, "admin").has(alice));
console.log("get:", names.get(alice));
console.log("missing:", names.get(bob) === undefined);
console.log("delete:", names.delete(alice), names.has(alice));

const token = new Token(7);
const other = new Token(8);
const seen = new WeakSet<Token>();
console.log("add:", seen.add(token).has(token));
console.log("other:", seen.has(other));
console.log("remove:", seen.delete(token), seen.has(token));
