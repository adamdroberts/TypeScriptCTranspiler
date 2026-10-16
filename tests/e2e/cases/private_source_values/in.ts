const executeSource=eval;
class Task{constructor(body:string){console.log(executeSource(body));}}
new Task("17;");
class Holder{#callback=Task;create(body:string){const callback=this.#callback;new callback(body);}}
new Holder().create("19;");
const copy={...{body:"23;"}};
console.log(executeSource(copy.body));
console.log("complete");
