function settled<T>(value: T): Promise<T> {
    return Promise.resolve(value);
}

const lift = async (value: number): Promise<number> => await settled(value + 1);

async function flow(flag: boolean): Promise<string> {
    let total = await settled(1);
    if (await settled(flag)) {
        total += await settled(2);
    } else {
        total += await settled(3);
    }

    for (let index = 0; await settled(index < 3); index = await settled(index + 1)) {
        if (index === 0) continue;
        if (await settled(index === 2)) break;
        total += await settled(index);
    }

    switch (await settled(total)) {
        case 4:
            total += await settled(4);
            break;
        default:
            total += await settled(5);
    }

    try {
        total = await lift(total);
        if (!flag) throw "recover";
    } catch (reason) {
        total += await settled(reason === "recover" ? 10 : 20);
    } finally {
        total += await settled(100);
    }
    return `${flag}:${total}`;
}

flow(true).then((first) => {
    flow(false).then((second) => console.log(`${first}|${second}`));
});
