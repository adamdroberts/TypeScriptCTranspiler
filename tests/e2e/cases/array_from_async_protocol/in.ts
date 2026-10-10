import {factory,marker,makeSource} from './source';
async function verify():Promise<void>{
 const unawaited:any=Promise.resolve(marker),source:any=makeSource(unawaited);
 const retained:any=await factory(source);console.log('async value:',retained[0]===unawaited,retained.length===1);
 const receiver:any={offset:7};let actual=0;
 const mapped:any=await factory(makeSource(marker),function(this:any,value:number,index:number):any{actual=arguments.length;return new Promise((resolve:any)=>queueMicrotask(()=>resolve([value,this,index])));},receiver);
 console.log('mapper:',mapped[0][0]===marker,mapped[0][1]===receiver,mapped[0][2]===0,actual===2);
 const physical:number[]=await Array.fromAsync([Promise.resolve(2),Promise.resolve(3)]);
 console.log('physical:',physical.length===2,physical[0]===2,physical[1]===3);
 let lengthReads=0;const arraylike:any={get length(){lengthReads++;return 1;},get 0(){return new Promise((resolve:any)=>queueMicrotask(()=>resolve(marker)));}};
 const fallback:any=await factory(arraylike);console.log('arraylike:',lengthReads===1,fallback[0]===marker);
 let closed=0;const error:any={token:37},iterator:any={[Symbol.asyncIterator](){return {next(){return {value:marker,done:false};},return(){closed++;return new Promise((_resolve:any,reject:any)=>queueMicrotask(()=>reject('secondary')));}};}};
 try{await factory(iterator,()=>{throw error;});}catch(actual){console.log('close:',actual===error,closed===1);}
}
verify().catch((error:any)=>{console.log('failure:',error);throw error;});
