import {delayed,next} from './owner';
async function run():Promise<void>{
 const value=await delayed();
 console.log(value==='fresh:7');
 const subsequent=await next();
 console.log(subsequent==='next:7');
}
run();
