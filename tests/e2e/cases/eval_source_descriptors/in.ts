console.log(eval('class C {static get mark(){return "97;";}}var getter=Object.getOwnPropertyDescriptor(C,"mark").get;eval(getter.call(C));'));
