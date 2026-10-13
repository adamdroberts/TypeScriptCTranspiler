const settings={body:'17;'};
function consume(source:string):any{
    eval('Math.random();');
    return eval(source);
}
console.log('captured:',consume(settings.body));
