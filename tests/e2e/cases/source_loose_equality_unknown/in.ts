{
  let code = "17;";
  const owner: any = {[Symbol.toPrimitive]() {code = String(Math.random()) + ";"; return 1;}};
  owner == 1;
  console.log(eval(code));
  console.log("equality-complete");
}
