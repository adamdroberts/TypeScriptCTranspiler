import {userInfo} from 'node:os';
const missing=undefined;
console.log('alias:',typeof userInfo({encoding:missing}).username);
let trace='';const owner=Object.create({get encoding(){trace+='g';return 'buffer'}});
const result=userInfo(owner,...Array.from({length:5},()=>{trace+='a';return 0}));
console.log('options:',trace,Buffer.isBuffer(result.username));
const marker={};try{userInfo({get encoding():any{throw marker}})}catch(error){console.log('abrupt:',error===marker)}
console.log('default:',typeof userInfo(void (trace+='v')).username,trace);
