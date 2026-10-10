import {marker,symbol,owner,enumerate,retain,shared} from './source';
async function verify():Promise<void>{
 const keys:string[]=[];for(const key in owner)keys.push(key);
 console.log('enumeration:',keys.join('|'));
 console.log('generator:',Array.from(enumerate()).join('|'));
 const target:any={},assigned:string[]=[];for(target.key in owner)assigned.push(target.key);
 console.log('assignment:',assigned.join('|'));
 let nullish=0;for(const key in null as any)nullish++;for(const key in undefined as any)nullish++;
 console.log('nullish:',nullish);
 const common=shared();console.log('shared:',common[0]()==='inherited',common[1]()==='inherited');
 const callbacks=await retain(owner);
 console.log('retained:',callbacks[0]()[0]==='1',callbacks[0]()[1]===marker,callbacks[1]()[1]===symbol,callbacks[2]()[1]===marker);
 let cleanup=0;
 async function rejected():Promise<any>{
  for(const key in owner){try{await Promise.reject(marker);}catch(error){if(error!==marker)throw error;}finally{cleanup++;await Promise.reject(symbol);}}
 }
 try{await rejected();console.log('missing');}catch(error){console.log('completion:',error===symbol,cleanup===1);}
}
verify().catch((error:any)=>{console.log('failure:'+String(error));throw error;});
