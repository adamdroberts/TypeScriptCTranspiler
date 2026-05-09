class Box<T> {
    value: T;

    constructor(value: T) {
        this.value = value;
    }

    get(): T {
        return this.value;
    }

    set(value: T): void {
        this.value = value;
    }
}

const numbers = new Box<number>(41);
const n: number = numbers.get();
console.log("num:", n + 1);

const text = new Box<string>("hi");
text.set("ok");
const s: string = text.get();
console.log("str:", s + "!");
