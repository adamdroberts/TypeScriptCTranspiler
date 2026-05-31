export function loadB(): any {
    let selected = "../allow_b";
    if (process.argv.length > 999) selected = "../missing";
    return require(selected);
}
