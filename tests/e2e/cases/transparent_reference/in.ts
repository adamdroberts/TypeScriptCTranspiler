let rows:number[]=[7n as any];
const old=(rows[0]!)++;
console.log(typeof old,String(old),typeof rows[0],String(rows[0]));
const owner={value:11n};
console.log(String(++(owner.value as any)),String(owner.value));
(owner.value satisfies any)+=3n;
console.log(String(owner.value));
let value:any=0;
((value as any)!)||=17n;
console.log(typeof value,String(value));
class Counter {#value=19n;step(){return (this.#value!)++;}read(){return this.#value;}}
const counter=new Counter();
console.log(String(counter.step()),String(counter.read()));
async function run(){const values=[23n];async function key(){return 0;}const saved=(values[await key()] as any)!++;console.log(String(saved),String(values[0]));}
run();
