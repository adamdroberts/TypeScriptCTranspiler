export {};
const key=Symbol('property');let trace='';const marker={};
const values=[1,'text',true,17n,Symbol('value')];
for(const value of values){
 const prototype=Object.getPrototypeOf(Object(value));
 Object.defineProperty(prototype,'probe',{configurable:true,get:function(){'use strict';trace+='get|';return 3;},set:function(next:any){'use strict';trace+='set:'+typeof this+':'+(this===value)+':'+String(next)+'|';}});
 Object.defineProperty(prototype,key,{configurable:true,set:function(next:any){'use strict';trace+='symbol:'+typeof this+':'+(this===value)+':'+next+'|';}});
 const alias:any=value;trace='';console.log('assignment',typeof value,(alias.probe=11),trace);
 trace='';console.log('compound',typeof value,(alias.probe+=2),trace);
 trace='';console.log('update',typeof value,alias.probe++,trace);
 trace='';console.log('logical',typeof value,(alias.probe&&=7),trace);
 trace='';alias[key]=13;console.log('symbol',typeof value,trace);
 delete prototype.probe;delete prototype[key];
 const parent=Object.getPrototypeOf(prototype);Object.setPrototypeOf(prototype,new Proxy(parent,{set(target:any,name:any,next:any,receiver:any){trace+='proxy:'+typeof receiver+':'+(receiver===value)+':'+name+':'+next;return true;}}));
 trace='';alias.probe=19;console.log('inherited',typeof value,trace);Object.setPrototypeOf(prototype,parent);
}
const p=Number.prototype as any;
Object.defineProperty(p,'literal',{configurable:true,set:function(next:any){'use strict';console.log('literal',typeof this,this===1,next);}});
(1 as any).literal=23;delete p.literal;
let effects='';function base():any{effects+='base|';return 1;}function name():any{effects+='name|';return {toString(){effects+='key|';return 'absent';}};}function rhs():number{effects+='rhs|';return 29;}
try{base()[name()]=rhs();}catch(error){console.log('strict failure',error instanceof TypeError,effects);}
effects='';try{(null as any)[name()]=rhs();}catch(error){console.log('nullish',error instanceof TypeError,effects);}
Object.defineProperty(p,'throwing',{configurable:true,set(){throw marker;}});try{(1 as any).throwing=31;}catch(error){console.log('abrupt',error===marker);}delete p.throwing;
for(const name of ['0','length']){try{('abc' as any)[name]=37;}catch(error){console.log('string own',name,error instanceof TypeError);}}
async function suspended(){let log='',stored=3;const prototype=Number.prototype as any;Object.defineProperty(prototype,'suspended',{configurable:true,get:function(){'use strict';log+='get|';return stored;},set:function(value:number){'use strict';log+='set:'+typeof this+':'+value+'|';stored=value;}});async function right():Promise<number>{log+='await|';return 5;}const result=(1 as any).suspended+=await right();delete prototype.suspended;console.log('suspended',result,log);}suspended();
console.log('done');
