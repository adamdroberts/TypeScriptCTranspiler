import timersDefault, { clearTimeout, setTimeout as importedTimeout } from "node:timers";
import * as timers from "timers";

const events: string[] = [];

const droppedTimeout = importedTimeout((): void => {
    events.push("dropped-timeout");
}, 0);
clearTimeout(droppedTimeout);

const droppedImmediate = timers.setImmediate((): void => {
    events.push("dropped-immediate");
});
timersDefault.clearImmediate(droppedImmediate);

importedTimeout((label: string): void => {
    events.push(label);
}, undefined, "named-timeout");

timers.setTimeout((label: string): void => {
    events.push(label);
}, 0, "namespace-timeout");

timersDefault.setImmediate((label: string): void => {
    events.push(label);
}, "default-immediate");

timers.clearInterval(undefined);
timersDefault.setImmediate((): void => {
    console.log(events.join("|"));
});
