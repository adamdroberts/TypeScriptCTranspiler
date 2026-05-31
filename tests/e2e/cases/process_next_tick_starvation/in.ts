let count = 0;

function recurse() {
    count++;
    if (count > 1005) {
        console.log("Error: did not trigger guard");
        return;
    }
    try {
        process.nextTick(recurse);
    } catch (e: any) {
        console.log(`Caught nextTick error at count ${count}:`, e);
        return;
    }
}

process.nextTick(recurse);
