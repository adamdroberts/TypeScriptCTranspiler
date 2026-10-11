function strictCaller(): string {
    "use strict";
    try { eval("var unpublished=17;with({}){}"); return "accepted"; }
    catch (error) { return (error as any).constructor.name; }
}
function declarationBody(): string {
    try { eval("with({}) function f(){}"); return "accepted"; }
    catch (error) { return (error as any).constructor.name; }
}
console.log(strictCaller());
console.log(declarationBody());
