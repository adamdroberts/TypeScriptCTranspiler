{
    let code = String(Math.random()) + ";";
    code = "17;";
    console.log(eval(code));
    console.log("replacement-complete");
}
function replacement(flag: boolean): void {
    let code = String(Math.random()) + ";";
    if (flag) code = "17;";
    else code = "19;";
    console.log(eval(code));
}
replacement(true);
replacement(false);
