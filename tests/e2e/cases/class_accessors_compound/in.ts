class Counter {
    raw: number = 5;

    get value(): number {
        return this.raw;
    }

    set value(next: number) {
        this.raw = next;
    }

    static labelText: string = "A";

    static get label(): string {
        return Counter.labelText;
    }

    static set label(next: string) {
        Counter.labelText = next;
    }
}

const counter = new Counter();
console.log("plus:", counter.value += 3, counter.value);
console.log("mul:", counter.value *= 2, counter.value);
console.log("mod:", counter.value %= 5, counter.value);
console.log("static:", Counter.label += "B", Counter.label);
