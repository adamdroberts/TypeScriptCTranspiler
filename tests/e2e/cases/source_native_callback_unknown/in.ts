const executeSource = eval;
function read(body: string = "17;"): void { console.log(executeSource(body)); }
read();
(Array.prototype as any).callback = read;
const callback: any = function() { return callback.callback("19;"); };
Object.setPrototypeOf(callback, Array.prototype);
callback();
console.log("complete");
