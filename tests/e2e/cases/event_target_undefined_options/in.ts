const target = new EventTarget();
const seen: string[] = [];

function first(event: Event): void {
    seen.push("first:" + event.type + ":" + event.cancelable);
}

function once(event: Event): void {
    seen.push("once:" + event.type);
}

target.addEventListener("save", first, {
    once: undefined,
    capture: undefined,
    passive: undefined,
});
target.addEventListener("save", once, {
    once: true,
    capture: undefined,
    passive: undefined,
});

console.log("default event:", target.dispatchEvent(new Event("save", undefined)));
console.log("undefined cancelable:", target.dispatchEvent(new Event("save", { cancelable: undefined })));

target.removeEventListener("save", first, {
    capture: undefined,
});
console.log("removed:", target.dispatchEvent(new Event("save", { cancelable: true })));
console.log("seen:", seen.join("|"));
