{
  let code = "17;", saved = "";
  code = (saved = code, String(Math.random()) + ";");
  console.log(eval(saved));
  console.log("rhs-complete");
}
