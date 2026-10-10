import {setTimeout as delay,setImmediate as immediate} from 'node:timers/promises';
export function delayed():Promise<string>{return delay(1,'fresh:'+String(7));}
export function next():Promise<string>{return immediate('next:'+String(7));}
