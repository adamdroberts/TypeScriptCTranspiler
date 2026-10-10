import {delayed,expanded} from './owner';
async function run():Promise<void>{
 const noSignal=undefined,ref=true;
 const options={signal:noSignal,ref};
 const value=await delayed(options,'import:'+String(7));
 console.log(value==='import:7');
 const reads:string[]=[];
 const getters={get signal(){reads.push('signal');return undefined;},get ref(){reads.push('ref');return true;},get ignored(){throw 'unused';}};
 const subsequent=await expanded(['expanded:'+String(7),getters,'ignored']);
 console.log(subsequent==='expanded:7');
 console.log(reads.join('|'));
}
run();
