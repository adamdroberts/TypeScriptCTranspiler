const selectedNull: any = false ? true : null;
const selectedUndefined: any = true ? undefined : false;
console.log("static:", selectedNull === null, selectedUndefined === undefined);
for (const condition of [true, false]) {
    const value: any = condition ? null : undefined;
    console.log("selected:", value === null, value === undefined);
}
