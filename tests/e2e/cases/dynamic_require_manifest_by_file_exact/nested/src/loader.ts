export function load(): any {
    let selected = "../../allow_a";
    if (process.argv.length > 999) selected = "./missing";
    return require(selected);
}
