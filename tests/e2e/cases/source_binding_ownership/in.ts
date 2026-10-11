console.log(eval('this.p1=31;var object={p1:37};with(object){p1=41;}p1+":"+object.p1;'));
console.log(eval('this.missing=43;delete this.missing;try{missing;}catch(e){e.constructor.name;}'));
console.log(eval('Object.defineProperty(this,"defined",{value:47,configurable:true});defined;'));
console.log(eval('this.shadow=53;let shadow=59;shadow+":"+this.shadow;'));
