const f = Function();
console.log(typeof f);
console.log(f());

const f2 = new Function();
console.log(typeof f2);
console.log(f2());

const ev = eval(undefined as any);
console.log(typeof ev);
console.log(ev);
