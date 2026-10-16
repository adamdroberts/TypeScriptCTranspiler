{
  let code = "17;";
  const owner: any = {[Symbol.toPrimitive]() {code = "19;"; return 1;}};
  owner == 1;
  console.log(eval(code));
  console.log("equality-complete");
}

{
  let code = "17;";
  const owner: any = {[Symbol.toPrimitive]() {code = String(Math.random()) + ";"; return 1;}};
  owner == null;
  console.log(eval(code));
  console.log("equality-nullish-complete");
}
