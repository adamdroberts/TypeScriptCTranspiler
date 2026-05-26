const target = new EventTarget();
const seen: string[] = [];
const ONCE_TRUE = true;
const CANCELABLE_TRUE = true;
const FIRST_OPTIONS = {
    once: void 0,
    capture: undefined,
    passive: undefined,
} as const;
const ONCE_OPTIONS = {
    once: ONCE_TRUE,
    capture: void 0,
    passive: undefined,
} as const;
const DEFAULT_EVENT_OPTIONS = { cancelable: void 0 } as const;
const CANCELABLE_EVENT_OPTIONS = { cancelable: CANCELABLE_TRUE } as const;
const REMOVE_OPTIONS = {
    capture: void 0,
} as const;

function note(label: string): void {
    seen.push(label);
}

function first(event: Event): void {
    seen.push("first:" + event.type + ":" + event.cancelable);
}

function once(event: Event): void {
    seen.push("once:" + event.type);
}

target.addEventListener("save", first, FIRST_OPTIONS);
target.addEventListener("save", once, ONCE_OPTIONS);

const sideDefault = new Event("other", void note("event-options"));
console.log("side default:", sideDefault.type, sideDefault.cancelable);
console.log("default event:", target.dispatchEvent(new Event("save", void 0)));
console.log("undefined cancelable:", target.dispatchEvent(new Event("save", DEFAULT_EVENT_OPTIONS)));

target.removeEventListener("save", first, REMOVE_OPTIONS);
console.log("removed:", target.dispatchEvent(new Event("save", CANCELABLE_EVENT_OPTIONS)));
console.log("seen:", seen.join("|"));
