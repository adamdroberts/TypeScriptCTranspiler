class Box<T> {
    value: T;

    constructor(value: T) {
        this.value = value;
    }

    get current(): T {
        return this.value;
    }

    set current(next: T) {
        this.value = next;
    }
}

const numbers = new Box<number>(10);
const first: number = numbers.current;
console.log("num:", first + 1);
console.log("num set:", numbers.current = 20, numbers.current + 1);

const text = new Box<string>("hi");
const before: string = text.current;
text.current = before + "!";
console.log("str:", text.current + "?");
