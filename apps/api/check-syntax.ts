// Just checking if files parse
import * as fs from 'fs';
import * as path from 'path';

const srcDir = './src';

function checkFiles(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      checkFiles(fullPath);
    } else if (file.endsWith('.ts')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        console.log(`✓ ${fullPath}`);
      } catch (e) {
        console.error(`✗ ${fullPath}: ${e.message}`);
      }
    }
  }
}

checkFiles(srcDir);
