const root = "/tmp/tsc2c-fs-stats-kinds";
const filePath = path.join(root, "note.txt");

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(filePath, "kind");

const fileStat = fs.statSync(filePath);
const devNullStat = fs.statSync(os.devNull);

console.log("file:", fileStat.isBlockDevice(), fileStat.isCharacterDevice(), fileStat.isFIFO(), fileStat.isSocket());
console.log("dev null:", devNullStat.isCharacterDevice(), devNullStat.isFile(), devNullStat.isDirectory());

fs.rmSync(root, { recursive: true, force: true });
