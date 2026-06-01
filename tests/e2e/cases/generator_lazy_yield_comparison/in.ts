function* compare(): Generator<number, string, any> {
    const eq = (yield 1) === 5;
    const ne = (yield 2) !== 5;
    const loose = ((yield 3) as any) == 7;
    const lt = (yield 4) < 10;
    const le = (yield 5) <= 7;
    const gt = (yield 6) > 2;
    const ge = (yield 7) >= 9;
    return [eq, ne, loose, lt, le, gt, ge].join(",");
}

const iter = compare();
const first: any = iter.next();
const second: any = iter.next(5);
const third: any = iter.next(4);
const fourth: any = iter.next(7);
const fifth: any = iter.next(9);
const sixth: any = iter.next(7);
const seventh: any = iter.next(3);
const done: any = iter.next(9);

console.log(
    "steps:",
    first.value,
    second.value,
    third.value,
    fourth.value,
    fifth.value,
    sixth.value,
    seventh.value,
    done.done,
    done.value,
);
