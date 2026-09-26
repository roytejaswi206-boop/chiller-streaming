import fs from 'fs';
import path from 'path';

function walk(dir: string, filelist: string[] = []): string[] {
  if (!fs.existsSync(dir)) return filelist;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      walk(filepath, filelist);
    } else {
      filelist.push(filepath);
    }
  }
  return filelist;
}

const allAppFiles = walk('app');
const pages = allAppFiles.filter(f => f.endsWith('page.tsx')).map(f => f.replace(/\\/g, '/'));
const apiRoutes = allAppFiles.filter(f => f.endsWith('route.ts')).map(f => f.replace(/\\/g, '/'));
const components = walk('components').filter(f => f.endsWith('.tsx') || f.endsWith('.ts')).map(f => f.replace(/\\/g, '/'));
const libFiles = walk('lib').filter(f => f.endsWith('.ts') || f.endsWith('.tsx')).map(f => f.replace(/\\/g, '/'));

console.log('--- INVENTORY SUMMARY ---');
console.log('Total Pages:', pages.length);
console.log('Total API Routes:', apiRoutes.length);
console.log('Total Components:', components.length);
console.log('Total Lib Modules:', libFiles.length);

fs.writeFileSync('scripts/inventory_data.json', JSON.stringify({
  pages,
  apiRoutes,
  components,
  libFiles
}, null, 2));

console.log('Inventory saved to scripts/inventory_data.json');
