const events: string[] = [];

class BaseKeyRecord {
    alpha: string = "a";
}

class KeyRecord extends BaseKeyRecord {
    beta: string = "b";
}

function* classKeys(record: KeyRecord): Generator<string, string, string> {
    for (const key in record) {
        events.push("class:" + key);
        yield key;
        if (key === "beta") break;
    }
    return "class-done";
}

interface KeyShape {
    alpha: string;
    beta: string;
}

function* interfaceKeys(record: KeyShape): Generator<string, string, string> {
    for (const key in record) {
        events.push("interface:" + key);
        yield key;
        if (key === "alpha") break;
    }
    return "interface-done";
}

const iter = classKeys(new KeyRecord());
console.log("created" + (events.length ? " " + events.join("|") : ""));
const first: any = iter.next("ignored");
console.log("first", first.done, first.value, events.join("|"));
const second: any = iter.next("resume");
console.log("second", second.done, second.value, events.join("|"));
const third: any = iter.next("resume");
console.log("third", third.done, third.value, events.join("|"));

const interfaceIter = interfaceKeys({ alpha: "a", beta: "b" });
console.log("interface-created", events.join("|"));
const interfaceFirst: any = interfaceIter.next("ignored");
console.log("interface-first", interfaceFirst.done, interfaceFirst.value, events.join("|"));
const interfaceSecond: any = interfaceIter.next("resume");
console.log("interface-second", interfaceSecond.done, interfaceSecond.value, events.join("|"));
