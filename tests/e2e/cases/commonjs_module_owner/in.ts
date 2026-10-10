// @ts-nocheck: computed CommonJS export metadata is checked by native execution.
import greet, { count, repeat } from './owner.cjs';
import * as namespace from './owner.cjs';
const owner=require('./owner.cjs');
console.log(greet('Ada'),count,repeat(3),owner===namespace,owner===require('./owner.cjs'));
console.log(owner.initial===owner.original,owner.original.detached,Object.getOwnPropertyDescriptor(owner,'hidden').value===owner.marker);
owner.set(11);console.log(namespace.default('Lin'),namespace.count,namespace.repeat(4));
const copied=Object.assign({},owner);console.log(copied.fresh.token,copied[owner.symbol]===owner.marker,Object.keys(copied).includes('hidden'));
async function retained():Promise<void>{const callee=owner.repeat;await Promise.resolve();console.log(callee.call(owner,5),owner===require('./owner.cjs'));}retained();
