{
  const state = {body: "17;"};
  const attach = Promise.prototype.then;
  const capability = Promise.withResolvers<any>();
  attach.call(capability.promise, undefined, () => {
    console.log(eval(state.body));
    console.log("self-resolution-complete");
  });
  Object.defineProperty(capability.promise, "then", {get() {
    state.body = String(Math.random()) + ";";
    return undefined;
  }});
  capability.resolve(capability.promise);
}
