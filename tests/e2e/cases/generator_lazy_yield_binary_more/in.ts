function* ops(): Generator<number, string, any> {
    const mod = (yield 10) % 4;
    const pow = 2 ** (yield mod);
    const and = (yield pow) & 6;
    const or = (yield and) | 2;
    const xor = (yield or) ^ 5;
    const shl = (yield xor) << 2;
    const shr = (yield shl) >> 1;
    const ushr = (yield shr) >>> 1;
    const dynamic = ((yield ushr) as any) % 5;
    return [mod, pow, and, or, xor, shl, shr, ushr, dynamic].join(",");
}

const iter = ops();
const first: any = iter.next();
const second: any = iter.next(14);
const third: any = iter.next(3);
const fourth: any = iter.next(7);
const fifth: any = iter.next(4);
const sixth: any = iter.next(3);
const seventh: any = iter.next(3);
const eighth: any = iter.next(10);
const ninth: any = iter.next(-2);
const done: any = iter.next(17);

console.log(
    "steps:",
    first.value,
    second.value,
    third.value,
    fourth.value,
    fifth.value,
    sixth.value,
    seventh.value,
    eighth.value,
    ninth.value,
    done.done,
    done.value,
);
