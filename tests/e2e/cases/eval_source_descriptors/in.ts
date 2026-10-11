console.log(eval('class C {static get mark(){return "97;";}}var getter=Object.getOwnPropertyDescriptor(C,"mark").get;eval(getter.call(C));'));
console.log(eval('eval(Object.getOwnPropertyDescriptor({value:1},"value").writable);'));
console.log(eval('var owner={};Object.defineProperty(owner,"value",{get(){return 1;}});eval(Object.getOwnPropertyDescriptors(owner).value.enumerable);'));
