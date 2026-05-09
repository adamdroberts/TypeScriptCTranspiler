interface User {
    name: string;
}

class Box {
    value: number;
    constructor(value: number) {
        this.value = value;
    }
}

const user: User = { name: "ada" };
const userRef = new WeakRef<User>(user);
const found = userRef.deref();
console.log("user:", found?.name ?? "missing");

const box = new Box(42);
const boxRef = new WeakRef<Box>(box);
console.log("box:", boxRef.deref()?.value ?? -1);
console.log("same:", boxRef.deref() === box);
console.log("text:", "" + boxRef);

const seen = new WeakSet<WeakRef<Box>>();
seen.add(boxRef);
console.log("ref key:", seen.has(boxRef));
