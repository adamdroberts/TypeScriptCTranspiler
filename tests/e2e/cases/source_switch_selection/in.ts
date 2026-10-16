{
  const choose = (): number => 0;
  const run = () => {
    let code = "17;";
    switch (choose()) {
      default: console.log(eval(code)); break;
      case (code = "19;", 1): break;
    }
  };
  run();
  console.log("switch-complete");
}
