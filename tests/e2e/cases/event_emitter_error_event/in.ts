const unhandled = new EventEmitter();

try {
    console.log("unhandled emit:", unhandled.emit("error", "boom"));
} catch (e) {
    console.log("caught:", e);
}

const handled = new EventEmitter();
handled.on("error", (message: string): void => {
    console.log("handled:", message);
});

console.log("handled emit:", handled.emit("error", "ok"));
