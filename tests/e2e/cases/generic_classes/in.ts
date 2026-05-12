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

    choose(left: T, right: T): T {
        return right;
    }
}

const numbers = new Box<number>(41);
const n: number = numbers.get();
console.log("num:", n + 1);
const numberPair = [100, 200];
const chosenNumber: number = numbers.choose(...(numberPair as [number, number]));
console.log("num spread:", chosenNumber + 1);

const text = new Box<string>("hi");
text.set("ok");
const s: string = text.get();
console.log("str:", s + "!");
const wordPair = ["left", "right"];
const chosenWord: string = text.choose(...(wordPair as [string, string]));
console.log("str spread:", chosenWord + "!");
