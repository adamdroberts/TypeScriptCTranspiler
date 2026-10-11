let count = 0;
const limit = 4096;
function recurse(): void {
    count++;
    if (count < limit) process.nextTick(recurse);
    else console.log("finite next-tick chain:", count);
}
process.nextTick(recurse);
