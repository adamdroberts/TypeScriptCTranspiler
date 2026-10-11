async function verify(): Promise<void> {
    const ordinary: any = eval(`
    function retained(){
        var value=11;const object={value:17,method(){return this.value;}};
        let reader,inside;
        with(object){inside=method();reader=function(){return value;};var value=23;}
        return [inside,reader(),value];
    }
    retained();
    `);
    console.log(ordinary.join(":"));
    const suspended: any = await eval(`
    (async function(){
        var value=11;const object={value:17,method(arg){return this.value+arg;}};
        let inside;
        with(object){value=await Promise.resolve(23);inside=method(await Promise.resolve(2));}
        const iterator=(function*(){with(object){yield value;}return value;})();
        return [inside,iterator.next().value,iterator.next().value,value];
    })();
    `);
    console.log(suspended.join(":"));
}
verify();
