const target = new EventTarget();
const seen: string[] = [];

function onceListener(event: Event): void {
    seen.push("once:" + event.type);
    target.dispatchEvent(new Event("save"));
}

function normal(event: Event): void {
    seen.push("normal:" + event.type + ":" + event.defaultPrevented);
}

target.addEventListener("save", onceListener, { once: true });
target.addEventListener("save", onceListener, { once: true });
target.addEventListener("save", normal, { capture: false, passive: true });

console.log("first:", target.dispatchEvent(new Event("save")));
console.log("second:", target.dispatchEvent(new Event("save")));

target.removeEventListener("save", normal, true);
console.log("third:", target.dispatchEvent(new Event("save")));
console.log("seen:", seen.join("|"));
