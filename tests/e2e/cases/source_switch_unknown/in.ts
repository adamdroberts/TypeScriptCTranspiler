{
  const choose = (): number => 0;
  const run = () => {
    let code = "17;";
    switch (choose()) {
      default: console.log(eval(code)); break;
      case (code = String(Math.random()) + ";", 1): break;
    }
  };
  run();
}
