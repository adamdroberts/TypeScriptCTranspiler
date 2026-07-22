const events: string[] = [];

class KeyRecord {
    alpha: string = "a";
    beta: string = "b";
}

function* classKeys(record: KeyRecord): Generator<string, string, string> {
    for (const key in record) {
        events.push("class:" + key);
        yield key;
        if (key === "alpha") break;
    }
    return "class-done";
}

const iter = classKeys(new KeyRecord());
console.log("created" + (events.length ? " " + events.join("|") : ""));
const first: any = iter.next("ignored");
console.log("first", first.done, first.value, events.join("|"));
const second: any = iter.next("resume");
console.log("second", second.done, second.value, events.join("|"));
