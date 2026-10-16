{
  let code = "17;", saved = "";
  const target: any = {};
  const key = {[Symbol.toPrimitive]() {code = String(Math.random()) + ";"; return "slot";}};
  target[key as any] = 0; saved = code;
  console.log(eval(saved));
  console.log("reference-complete");
}
