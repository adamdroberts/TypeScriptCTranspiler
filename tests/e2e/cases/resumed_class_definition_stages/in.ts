import {makeBase,makeAsync,makeGenerator,makeAsyncGenerator,events} from './owner';
async function main():Promise<void>{
 const Base=makeBase(),key=Symbol('method');
 const rows:any[]=[{protocol:'async',factory:makeAsync},{protocol:'generator',factory:makeGenerator},{protocol:'async-generator',factory:makeAsyncGenerator}];
 for(const row of rows){
  events.length=0;let Ctor:any;
  if(row.protocol==='async')Ctor=await row.factory(Base,17,key);
  else {const iterator=row.factory(Base,17,key);let step=await iterator.next();while(!step.done)step=await iterator.next(step.value);Ctor=step.value}
  const owner=new Ctor(),read=owner[key]();
  console.log(row.protocol+':'+(read[0]===Ctor&&read[1]===17&&read[2]===17&&owner.field===17&&owner.inner()===Ctor&&owner.target===Ctor&&owner instanceof Base&&Object.getPrototypeOf(Ctor)===Base));
  console.log(events.join(','));
 }
}main();
