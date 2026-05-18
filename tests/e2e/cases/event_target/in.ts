const target = new EventTarget();
const seen: string[] = [];

function first(event: Event): void {
    seen.push("first:" + event.type + ":" + event.cancelable + ":" + event.defaultPrevented);
    event.preventDefault();
    seen.push("first-after:" + event.defaultPrevented);
}

function second(event: Event): void {
    seen.push("second:" + event.type + ":" + event.defaultPrevented);
}

target.addEventListener("save", first);
target.addEventListener("save", second);
target.addEventListener("save", first);

const event = new Event("save", { cancelable: true });
console.log("dispatch1:", target.dispatchEvent(event));
console.log("after1:", event.defaultPrevented);

target.removeEventListener("save", first);

const plain = new Event("save");
console.log("dispatch2:", target.dispatchEvent(plain));
console.log("after2:", plain.defaultPrevented);

console.log(seen.join("|"));
