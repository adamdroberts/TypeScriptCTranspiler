class C{constructor(){console.log(eval("17;"));}}
const owner:any={};
owner.self=owner;
Object.defineProperty(owner,"callback",{get(){return C;},configurable:true});
[owner.callback,owner.callback].sort(function(callback:any){new callback();return 0;});
console.log("escape-owner-complete");
