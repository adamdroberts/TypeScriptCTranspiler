const topUndefined = undefined;
const topNull = null;

function readLocalNullish() {
    const localUndefined = undefined;
    const localNull = null;
    return [
        typeof localUndefined,
        localUndefined === undefined,
        typeof localNull,
        localNull === null,
    ];
}

const local = readLocalNullish();
console.log("top:", typeof topUndefined, topUndefined === undefined, typeof topNull, topNull === null);
console.log("local:", local[0], local[1], local[2], local[3]);
