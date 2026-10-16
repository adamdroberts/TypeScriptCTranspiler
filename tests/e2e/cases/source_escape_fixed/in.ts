const executeSource = eval;
class Task {
    constructor() { console.log(executeSource("17;")); }
}
[Task, Task].sort(function (first: any): number { new first(); return 0; });
console.log("complete");
