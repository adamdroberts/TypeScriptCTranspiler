type Left = 1;
type Right = 2;
type EvalSource = `${Left} + ${Right}`;

const evalSource: EvalSource = "1 + 2";
console.log("eval template type:", eval(evalSource));

type Word = "typed";
type Body = `return "${Word}";`;

const body: Body = 'return "typed";';
const make = Function(body);
console.log("function template type:", make());

const makeNew = new Function(body);
console.log("new function template type:", makeNew());
