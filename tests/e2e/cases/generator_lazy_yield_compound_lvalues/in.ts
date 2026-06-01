const events: string[] = [];

function mark(label: string, value: number): number {
    events.push(label + ":" + value);
    return value;
}

class Box {
    value: number;

    constructor(value: number) {
        this.value = value;
    }
}

const box = new Box(10);
const values: number[] = [2, 4];

function* flow(): Generator<number, string, number> {
    events.push("start");
    let index = 0;

    box.value += yield mark("yield prop", 1);
    events.push("box " + box.value);

    values[index] *= yield mark("yield elem", 2);
    events.push("value " + values[0]);

    return box.value + "|" + values[0];
}

const iter = flow();
console.log("created:", events.length === 0 ? "<empty>" : events.join("|"));

const first: any = iter.next(mark("ignored", 99));
box.value = 100;
values[0] = 100;
const second: any = iter.next(mark("prop", 5));
values[0] = 200;
const done: any = iter.next(mark("elem", 3));

console.log("steps:", first.done, first.value, second.done, second.value, done.done, done.value);
console.log("state:", box.value, values[0]);
console.log("events:", events.join("|"));
