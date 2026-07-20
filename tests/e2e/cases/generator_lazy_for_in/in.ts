const events: string[] = [];

function* arrayKeys(): Generator<string, string, string> {
    const values: number[] = [10, 20, 30];
    for (const key in values) {
        events.push("array:" + key);
        yield key;
        if (key === "1") break;
    }
    return "array-done";
}

function* stringKeys(): Generator<string, string, string> {
    const text: any = "ab";
    for (const key in text) {
        events.push("string:" + key);
        yield key;
    }
    return "string-done";
}

const a = arrayKeys();
console.log("created", events.join("|"));
const a1: any = a.next("ignored");
console.log("a1", a1.done, a1.value, events.join("|"));
const a2: any = a.next("resume");
console.log("a2", a2.done, a2.value, events.join("|"));
const a3: any = a.next("resume");
console.log("a3", a3.done, a3.value, events.join("|"));

const s = stringKeys();
const s1: any = s.next("ignored");
console.log("s1", s1.done, s1.value, events.join("|"));
