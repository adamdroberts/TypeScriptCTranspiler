import { marker, fallback, direct, expression, arrow, factory, pattern, generic, scope, suspended, generator, Receiver, native } from './source';

async function verify(): Promise<void> {
    const receiver = { token: 23 }, key = Symbol('key');
    const omitted = Reflect.apply(direct, receiver, []);
    const actual = Reflect.apply(direct, receiver, [null, marker, key]);
    console.log('actual', omitted[0] === marker, omitted[2] === receiver, omitted[3] === 0,
        actual[0] === null, actual[1][0] === marker, actual[1][1] === key, actual[3] === 3);
    const evaluated = expression();
    console.log('values', evaluated[0] === marker, evaluated[1] === 0, arrow() === marker,
        generic(marker) === marker, generic(key) === key, generic(null) === null);
    const retained = factory.call(receiver, marker, 29);
    const lexical = retained();
    console.log('lexical', lexical[0] === marker, lexical[1] === receiver, lexical[2] === 2, lexical[3]() === marker);
    const tree = pattern([undefined, 31, { value: 37 }, key]);
    const body = scope();
    console.log('bindings', tree[0] === marker, tree[1] === 37, tree[2][0] === key, body[0] === 17, body[1] === marker);
    const delayed = await suspended();
    const iterator = generator();
    console.log('suspended', delayed === marker, iterator.next().value === marker, iterator.next().value === marker);
    const physical = Reflect.apply(native, new Receiver(), []);
    console.log('native', physical[0] === 19, physical[1] === marker);

    const mapped = [41, 43].map(function (this: any, value: any): any { return [value, arguments.length, this]; });
    const reduced = [1, 2].reduce((acc: any, value: any): any => value === 1 ? marker : acc, null);
    console.log('array', mapped[0][0] === 41, mapped[0][1] === 3, mapped[0][2] === undefined, reduced === marker);
    const emitter = new EventEmitter();
    emitter.on('ready', function (this: any, value: number = fallback()): void {
        console.log('event', this === emitter, (value as any) === marker, arguments.length === 0);
    });
    emitter.emit('ready');
    const target = new EventTarget();
    target.addEventListener('ready', function (this: any, event: Event, value: number = fallback()): void {
        console.log('target', this === target, event.type === 'ready', (value as any) === marker, arguments.length === 1);
    });
    target.dispatchEvent(new Event('ready'));
    try { Reflect.apply((target as any).dispatchEvent, emitter, [new Event('ready')]); throw 'missing'; }
    catch (error: any) { console.log('event brand', error instanceof TypeError); }
    await new Promise<void>((resolve) => {
        process.nextTick(function (value: number = fallback()): void {
            console.log('tick', (value as any) === marker, arguments.length === 0); resolve();
        });
    });
    await new Promise<void>((resolve) => {
        queueMicrotask(function (value: number = fallback()): void {
            console.log('microtask', (value as any) === marker, arguments.length === 0); resolve();
        });
    });
    await new Promise<void>((resolve) => {
        setImmediate(function (value: number = fallback(), ...tail: any[]): void {
            console.log('immediate', (value as any) === marker, tail[0] === key, tail[1] === null, arguments.length === 3); resolve();
        }, ...([undefined, key, null] as any[]));
    });
    await new Promise<void>((resolve) => {
        setTimeout(function (value: number = fallback()): void {
            console.log('timeout', (value as any) === marker, arguments.length === 0); resolve();
        }, 0);
    });
}
verify().catch((error: any) => { console.log('failure', String(error)); throw error; });
