let ignoredSeen = "";
function mark(label: string): string {
    ignoredSeen += label;
    return label;
}
const target = new EventTarget(mark("t"));
const seen: string[] = [];

function first(event: Event): void {
    seen.push("first:" + event.type + ":" + event.cancelable + ":" + event.defaultPrevented);
    event.preventDefault(mark("p"));
    seen.push("first-after:" + event.defaultPrevented);
}

function second(event: Event): void {
    seen.push("second:" + event.type + ":" + event.defaultPrevented);
}

target.addEventListener("save", first);
target.addEventListener("save", second);
target.addEventListener("save", first);
target.addEventListener("save", second, undefined, mark("a"));

const event = new Event("save", { cancelable: true });
console.log("dispatch1:", target.dispatchEvent(event, mark("d")));
console.log("after1:", event.defaultPrevented);

target.removeEventListener("save", first, undefined, mark("r"));

const plain = new Event("save");
console.log("dispatch2:", target.dispatchEvent(plain, mark("e")));
console.log("after2:", plain.defaultPrevented);

console.log(seen.join("|"));
console.log("ignored:", ignoredSeen);
