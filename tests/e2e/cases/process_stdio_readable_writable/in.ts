console.log("stdin readable:", process.stdin.readable);
console.log("stdout readable:", (process.stdout as any).readable);
console.log("stderr readable:", (process.stderr as any).readable);
console.log("stdout writable:", process.stdout.writable);
console.log("stderr writable:", process.stderr.writable);
