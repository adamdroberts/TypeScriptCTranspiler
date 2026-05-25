type Scores = Record<string, number>;
type Flags = Record<"ready" | "done", boolean>;

const scores: Scores = { alpha: 2, beta: 3 };
const flags: Flags = { ready: true, done: false };

console.log("scores:", scores.alpha + scores.beta);
console.log("flags:", flags.ready, flags.done);
