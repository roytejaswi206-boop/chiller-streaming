import fs from "fs";
import path from "path";

const content = fs.readFileSync(path.join(process.cwd(), ".env"), "utf-8");
const keys = content.split("\n")
  .map(l => l.trim())
  .filter(l => l && !l.startsWith("#"))
  .map(l => l.split("=")[0].trim());
console.log("Local env keys:", keys);
