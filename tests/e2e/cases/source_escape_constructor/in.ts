const executeSource = eval;
class Task {
    constructor(body: string) { console.log(executeSource(body)); }
}
new Task("17;");
[Task, Task].sort(function (first: any): number { new first(String(Math.random())); return 0; });
console.log("complete");
