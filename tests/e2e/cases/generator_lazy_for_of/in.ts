const events: string[] = [];

function* numbers(): Generator<number, string, number> {
    const values: number[] = [1, 2, 3];
    for (const value of values) {
        events.push("number:" + value);
        if (value === 2) continue;
        yield value;
    }
    return "numbers-done";
}

function* letters(): Generator<string, string, string> {
    for (const letter of "ab") {
        events.push("letter:" + letter);
        yield letter;
        if (letter === "a") break;
    }
    return "letters-done";
}

const n = numbers();
console.log("n-created", events.join("|"));
const n1: any = n.next(0);
console.log("n1", n1.done, n1.value, events.join("|"));
const n2: any = n.next(0);
console.log("n2", n2.done, n2.value, events.join("|"));
const n3: any = n.next(0);
console.log("n3", n3.done, n3.value, events.join("|"));

const l = letters();
const l1: any = l.next("ignored");
console.log("l1", l1.done, l1.value, events.join("|"));
const l2: any = l.next("resume");
console.log("l2", l2.done, l2.value, events.join("|"));
