{
  function make(): any {return Promise.withResolvers<any>();}
  const first = make(), second = make();
  const state = {body: "17;"};
  Object.defineProperty(second.promise, "then", {get() {
    state.body = String(Math.random()) + ";";
    return undefined;
  }});
  first.resolve(second.promise);
  Promise.prototype.then.call(first.promise, () => console.log(eval(state.body)));
}
