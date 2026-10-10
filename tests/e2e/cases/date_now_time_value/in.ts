const clock: any = Date.now;
const ignored: any = {[Symbol.toPrimitive]() {throw new Error("ignored clock argument");}};
console.log("clock", Number.isInteger(Date.now(ignored)), Number.isInteger(clock.call({}, ignored)), Number.isInteger(clock.bind(null, ignored)()), Number.isInteger(new Date().getTime()));
