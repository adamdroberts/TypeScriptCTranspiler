const firstKey = "first";
const countKey = "count";

interface Row {
    first: string;
    count: number;
    ok: boolean;
}

const row: Row = {
    [firstKey]: "alpha",
    [countKey]: 3,
    ["ok"]: true,
};

console.log(row.first, row.count, row.ok);
