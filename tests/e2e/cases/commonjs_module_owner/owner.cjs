const original=exports,initial=this,local=require('./local.cjs');let state=7;
const values=Object.fromEntries([['default',function(name){return name+':'+state;}],['repeat',function(value){return value*state;}]]);
const owner=Object.assign(values,local,{initial,original,set(value){state=value;}});
Object.defineProperties(owner,{count:{enumerable:true,get(){return state;}},fresh:{enumerable:true,get(){return {token:state};}},hidden:{value:local.marker}});
owner[local.symbol]=local.marker;original.detached=true;module.exports=owner;
