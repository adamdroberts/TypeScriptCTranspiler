import timersDefault, { clearImmediate as importedClearImmediate, clearTimeout, clearTimeout as clearTimeoutAlias, setImmediate as importedImmediate, setTimeout as importedTimeout } from "node:timers";
import * as timers from "timers";

const events: string[] = [];

const droppedTimeout = importedTimeout((): void => {
    events.push("dropped-timeout");
}, 0);
clearTimeout(droppedTimeout);

const droppedTimeoutAlias = importedTimeout((): void => {
    events.push("dropped-timeout-alias");
}, 0);
clearTimeoutAlias(droppedTimeoutAlias);

const droppedImmediate = importedImmediate((): void => {
    events.push("dropped-immediate");
});
importedClearImmediate(droppedImmediate);

importedTimeout((label: string): void => {
    events.push(label);
}, undefined, "named-timeout");

timers.setTimeout((label: string): void => {
    events.push(label);
}, 0, "namespace-timeout");

importedImmediate((label: string): void => {
    events.push(label);
}, "named-immediate");

timersDefault.setImmediate((label: string): void => {
    events.push(label);
}, "default-immediate");

timers.clearInterval(undefined);
timersDefault.setImmediate((): void => {
    console.log(events.join("|"));
});
