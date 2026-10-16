{
  const thenable: any = {then(resolve: any) {resolve("17;");}};
  const task = Promise.resolve().then(() => thenable);
  thenable.then = (resolve: any) => resolve(String(Math.random()) + ";");
  task.then((code: string) => {
    console.log(eval(code));
    console.log("thenable-job-complete");
  });
}
