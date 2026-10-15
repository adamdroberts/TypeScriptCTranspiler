// @ts-nocheck
function check(value,label){if(!value)throw new Error(label);}
function strictArgs(){"use strict";return arguments;}
function nonSimple(value=17){return arguments;}
function simple(value){return arguments;}
const d=Object.getOwnPropertyDescriptor(strictArgs(),"callee"),thrower=d.get;
check(thrower===d.set&&Object.getOwnPropertyDescriptor(nonSimple(),"callee").get===thrower,"unmapped-identity");
check(simple(17).callee===simple,"mapped-callee");
check(thrower.name===""&&thrower.length===0&&!Object.isExtensible(thrower)&&Object.isFrozen(thrower),"metadata");
for(const name of ["caller","arguments"]){const p=Object.getOwnPropertyDescriptor(Function.prototype,name);check(p.get===thrower&&p.set===thrower&&!p.enumerable&&p.configurable,"prototype-poison");}
let tree=null;for(let depth=0;depth<512;depth++)tree={owner:Object.getOwnPropertyDescriptor(strictArgs(),"callee").get,previous:tree};
while(tree){check(tree.owner===thrower&&Object.isFrozen(tree.owner),"retained-owner");tree=tree.previous;}
let caught;try{thrower();}catch(error){caught=error;}check(caught instanceof TypeError,"call");
console.log("throw-type-error-owner-ok");
