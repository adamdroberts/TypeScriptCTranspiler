var rootBinding:any='before';
eval('0');
{function rootBinding(){return 'global';}}
console.log('global:',rootBinding());
function local():string{
    var localBinding:any='before';
    eval('{function localBinding(){return "local";}}');
    return localBinding();
}
console.log('local:',local());
console.log('isolated:',Object.hasOwn(globalThis,'localBinding')===false);
