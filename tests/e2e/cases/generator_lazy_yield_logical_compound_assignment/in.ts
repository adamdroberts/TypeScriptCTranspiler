const events: string[] = [];

function mark(label: string, value: any): any {
    events.push(label + ":" + value);
    return value;
}

class Box {
    value: any;

    constructor(value: any) {
        this.value = value;
    }
}

const box = new Box(0);
const values: any[] = [null, false];

function* flow(): Generator<number, string, any> {
    let a: any = "ready";
    let b: any = 0;
    let c: any = null;
    let d: any = "go";

    a ||= yield mark("skip or", 1);
    events.push("a " + a);

    b ||= yield mark("yield or", 2);
    events.push("b " + b);

    c ??= yield mark("yield nullish", 3);
    events.push("c " + c);

    values[1] &&= yield mark("skip and elem", 4);
    events.push("arr1 " + values[1]);

    box.value ||= yield mark("yield prop", 5);
    events.push("box " + box.value);

    d &&= (yield mark("yield and", 6)) + "-done";
    events.push("d " + d);

    return a + "|" + b + "|" + c + "|" + values[1] + "|" + box.value + "|" + d;
}

const iter = flow();
console.log("created:", events.length === 0 ? "<empty>" : events.join("|"));

const first: any = iter.next(mark("ignored", 99));
const second: any = iter.next(mark("or", 20));
const third: any = iter.next(mark("nullish", "set"));
box.value = 100;
const fourth: any = iter.next(mark("prop", 50));
const done: any = iter.next(mark("and", "X"));

console.log("steps:", first.done, first.value, second.done, second.value, third.done, third.value, fourth.done, fourth.value, done.done, done.value);
console.log("state:", box.value, values[1]);
console.log("events:", events.join("|"));
