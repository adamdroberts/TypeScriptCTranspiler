const events: string[] = [];

function mark(label: string, value: number): number {
    events.push(label + ":" + value);
    return value;
}

function* flow(): Generator<number, string, number> {
    events.push("start");
    let total = 10;
    let bits = 6;
    let power = 2;

    total += yield mark("yield add", 1);
    events.push("total " + total);

    bits &= yield mark("yield bit", 2);
    events.push("bits " + bits);

    power **= yield mark("yield power", 3);
    events.push("power " + power);

    return total + "|" + bits + "|" + power;
}

const iter = flow();
console.log("created:", events.length === 0 ? "<empty>" : events.join("|"));

const first: any = iter.next(mark("ignored", 99));
const second: any = iter.next(mark("add", 5));
const third: any = iter.next(mark("bit", 3));
const done: any = iter.next(mark("power", 4));

console.log("steps:", first.done, first.value, second.done, second.value, third.done, third.value, done.done, done.value);
console.log("events:", events.join("|"));
