{
  const thenable: any = {then(resolve: any) {resolve("17;");}};
  const task = Promise.resolve().then(() => thenable);
  thenable.then = (resolve: any) => resolve("19;");
  task.then((code: string) => {
    console.log(eval(code));
    console.log("thenable-job-complete");
  });
}

{
  const thenable: any = {then(resolve: any) {resolve("23;");}};
  async function run(): Promise<any> {await 0; return thenable;}
  const task = run();
  thenable.then = (resolve: any) => resolve("29;");
  task.then((code: string) => {
    console.log(eval(code));
    console.log("async-return-complete");
  });
}
