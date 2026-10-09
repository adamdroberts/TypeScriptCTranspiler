"use strict";

function collect() { if (false) $262.gc(); }
const tasks = [], results = [];
function check(value, label) { results.push(label + ":" + value); }
async function mapped(value) {
    const args = arguments, read = () => arguments;
    await Promise.resolve(1); collect();
    value += "!";
    await Promise.resolve(2); arguments[0] += "?";
    function own() { return arguments[0]; }
    return [args === arguments, read() === arguments, value, own("own"), arguments.length, arguments[0]];
}
tasks.push(mapped("A", "extra").then(result => check(result[0] && result[1] && result[2] === (true ? "A!" : "A!?") &&
    result[3] === "own" && result[4] === 2 && result[5] === (true ? "A?" : "A!?"), "mapped-parameter")));
async function replacement(value) {
    const args = arguments, read = () => value;
    function value() { return "function"; }
    await Promise.resolve(1); collect();
    return [args, read(), value];
}
tasks.push(replacement("parameter").then(result => check(result[1] === result[2] && result[2]() === "function" &&
    (result[0][0] === result[2]) === !true, "body-function-parameter-alias")));
async function strict(value) { "use strict"; const args = arguments; await Promise.resolve(1); value = "B"; return [args === arguments, arguments[0], value]; }
tasks.push(strict("A").then(result => check(result[0] && result[1] === "A" && result[2] === "B", "strict-unmapped")));
async function defaulted(value = () => value, read = value) {
    function value() { return "body"; }
    await Promise.resolve(1); collect();
    return [read() === read, value(), arguments[0] === undefined];
}
tasks.push(defaulted().then(result => check(result[0] && result[1] === "body" && result[2], "default-environment")));
async function arrowFactory(value) {
    const args = arguments;
    const run = async () => { await Promise.resolve(1); collect(); return arguments; };
    await Promise.resolve(2);
    const received = await run();
    return [args, received];
}
tasks.push(arrowFactory("arrow").then(result => check(result[0] === result[1] && result[1][0] === "arrow", "async-arrow-arguments")));
const holder = { tag: "receiver", run: async function () {
    const self = this;
    await Promise.resolve(1); collect();
    const reader = () => this;
    await Promise.resolve(2);
    return [self === this, reader() === this, this.tag, new.target === undefined];
} };
tasks.push(holder.run().then(result => check(result[0] && result[1] && result[2] === "receiver" && result[3], "receiver-and-own-new-target")));
function Constructor() {
    this.run = async () => { const target = new.target; await Promise.resolve(1); collect(); return [target === Constructor, new.target === Constructor]; };
}
const instance = new Constructor();
tasks.push(instance.run().then(result => check(result[0] && result[1], "async-arrow-new-target")));
async function isolated(value) { const args = arguments; await Promise.resolve(1); value += "!"; await Promise.resolve(2); return [args, value]; }
tasks.push(Promise.all([isolated("L"), isolated("R")]).then(result => check(result[0][0] !== result[1][0] &&
    result[0][1] === "L!" && result[1][1] === "R!" && result[0][0][0] === (true ? "L" : "L!") &&
    result[1][0][0] === (true ? "R" : "R!"), "invocation-isolation")));

Promise.all(tasks).then(() => { results.sort(); for (const result of results) console.log(result); });
