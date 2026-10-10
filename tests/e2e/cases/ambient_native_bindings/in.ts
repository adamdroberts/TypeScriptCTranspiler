import {makeController,copy,sparse,retain} from './source';
const marker:any={token:31};const values:any=copy(marker),holes:any=sparse();
console.log('intrinsics:',values[0]===marker,holes.length===2,!Object.hasOwn(holes,'0'));
const read:any=retain(marker);console.log('source binding:',read()===marker);
const controller:any=makeController();let calls=0,receiver:any;
controller.signal.addEventListener('abort',function(this:any,event:any):void{calls++;receiver=this;console.log('event:',event.type==='abort');});
controller.abort(marker);console.log('host:',calls===1,receiver===controller.signal,controller.signal.reason===marker);
