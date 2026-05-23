const target = new EventTarget();
const other = new EventTarget();

function onReady(this: EventTarget, event: Event): void {
    console.log("this:", this === target, this === other, event.type, event.target === target, event.currentTarget === target);
}

function onOnce(this: EventTarget, event: Event): void {
    console.log("once:", this === target, event.type);
}

target.addEventListener("ready", onReady);
target.addEventListener("ready", onOnce, { once: true });
console.log("first:", target.dispatchEvent(new Event("ready")));
console.log("second:", target.dispatchEvent(new Event("ready")));
target.removeEventListener("ready", onReady);
console.log("third:", target.dispatchEvent(new Event("ready")));
