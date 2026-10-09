const events: string[] = [];
const iterable: any = { [Symbol.iterator]() {
    return {
        next() { return { value: 7, done: false }; },
        return() { events.push("close"); return {}; },
    };
} };
function selected(): number {
    let value = 10;
    try {
        for (const item of iterable) {
            try { let value = 20; return value + item; }
            finally { events.push("inner:" + value); value++; }
        }
    } finally { events.push("outer:" + value); }
    return 0;
}
console.log("selected:", selected());
console.log("events:", events.join("|"));
function overridden(): string {
    try { return "pending"; }
    finally { return "final"; }
}
console.log("override:", overridden());
function empty(): void {
    try { for (const value of iterable) return; }
    finally { events.push("void-finally"); }
}
empty();
console.log("void:", events.slice(-2).join("|"));
let count = 0;
outside: for (let index = 0; index < 2; index++) {
    try { for (const value of iterable) break outside; }
    finally { count++; continue outside; }
}
console.log("continue:", count);
const asyncEvents: string[] = [];
const thenable: any = {
    get then() {
        asyncEvents.push("get-then");
        return (resolve: (value: number) => void) => { asyncEvents.push("then"); resolve(12); };
    },
};
async function deferred(): Promise<number> {
    try { return thenable; }
    finally { asyncEvents.push("finally"); }
}
deferred().then(value => console.log("async:", value, asyncEvents.join("|")));
