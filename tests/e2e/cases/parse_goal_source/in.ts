function parseGoalThis(this: any): boolean { return this === undefined; }
function parseGoalDirective(this: any): boolean { "use strict"; return this === undefined; }
console.log("functions:", parseGoalThis(), parseGoalDirective());
console.log("eval:", eval("(function(){return this===undefined})()"));
