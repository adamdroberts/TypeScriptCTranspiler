{
  const owner = {body: "17;"};
  setImmediate(() => {
    console.log(eval(owner.body));
    console.log("deferred-complete");
  });
  owner.body = "19;";
}
