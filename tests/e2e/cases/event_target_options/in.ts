const target = new EventTarget();
const seen: string[] = [];
const ONCE_TRUE = true;
const CAPTURE_FALSE = false;
const PASSIVE_TRUE = true;
const REMOVE_CAPTURE_TRUE = true;

function onceListener(event: Event): void {
    seen.push("once:" + event.type);
    target.dispatchEvent(new Event("save"));
}

function normal(event: Event): void {
    seen.push("normal:" + event.type + ":" + event.defaultPrevented);
}

target.addEventListener("save", onceListener, { once: ONCE_TRUE });
target.addEventListener("save", onceListener, { once: ONCE_TRUE });
target.addEventListener("save", normal, { capture: CAPTURE_FALSE, passive: PASSIVE_TRUE });

console.log("first:", target.dispatchEvent(new Event("save")));
console.log("second:", target.dispatchEvent(new Event("save")));

target.removeEventListener("save", normal, REMOVE_CAPTURE_TRUE);
console.log("third:", target.dispatchEvent(new Event("save")));
console.log("seen:", seen.join("|"));
