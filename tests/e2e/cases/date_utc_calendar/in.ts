const utc: any = Date.UTC;
console.log("negative", Date.UTC(1970, 0, 1, 0, 0, -1), utc(1970, 0, 1, 0, 0, -1, 999.9));
console.log("fractions", Date.UTC(1970, 0, 1, 0, 0, 0, -0.9), Object.is(utc(1970, 0, 1, 0, 0, 0, -0.9), 0));
console.log("order", Date.UTC(1970, 0, 1, 80063993375, 29, 1, -288230376151711740), Date.UTC(1970, 0, 213503982336, 0, 0, 0, -18446744073709552000));
console.log("clip", Date.UTC(275760, 8, 13), Number.isNaN(Date.UTC(275760, 8, 13, 0, 0, 0, 1)));
console.log("normalize", Date.UTC(2016, -1, 1), Date.UTC(2000, 1, 29), Date.UTC(1900, 1, 29));
