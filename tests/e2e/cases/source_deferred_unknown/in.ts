{
  const owner = {body: "17;"};
  setImmediate(() => console.log(eval(owner.body)));
  owner.body = String(Math.random()) + ";";
}
