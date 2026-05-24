const target = new EventTarget();
const seen: string[] = [];
const ONCE_TRUE = true;
const CANCELABLE_TRUE = true;

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
    once: ONCE_TRUE,
    capture: undefined,
    passive: undefined,
});

console.log("default event:", target.dispatchEvent(new Event("save", undefined)));
console.log("undefined cancelable:", target.dispatchEvent(new Event("save", { cancelable: undefined })));

target.removeEventListener("save", first, {
    capture: undefined,
});
console.log("removed:", target.dispatchEvent(new Event("save", { cancelable: CANCELABLE_TRUE })));
console.log("seen:", seen.join("|"));
