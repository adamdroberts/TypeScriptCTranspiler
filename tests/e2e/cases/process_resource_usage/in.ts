const usage = process.resourceUsage();

console.log("cpu:", typeof usage.userCPUTime, typeof usage.systemCPUTime, usage.userCPUTime >= 0, usage.systemCPUTime >= 0);
console.log("memory:", typeof usage.maxRSS, typeof usage.sharedMemorySize, typeof usage.unsharedDataSize, typeof usage.unsharedStackSize);
console.log("faults:", usage.minorPageFault >= 0, usage.majorPageFault >= 0, usage.swappedOut >= 0);
console.log("io:", usage.fsRead >= 0, usage.fsWrite >= 0, usage.ipcSent >= 0, usage.ipcReceived >= 0);
console.log("signals:", usage.signalsCount >= 0, usage.voluntaryContextSwitches >= 0, usage.involuntaryContextSwitches >= 0);
