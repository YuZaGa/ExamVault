import fs from 'fs';
import path from 'path';

const apiDir = '/mnt/c/Users/yuman/Vault/05_Archive/Api';

function searchDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'resources' && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        searchDir(fullPath);
      }
    } else if (entry.name.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('ratio of demand for Fruits') || content.includes('Fruits : Vegetables')) {
        console.log(`Found in: ${fullPath}`);
        const idx = content.indexOf('ratio of demand for Fruits');
        console.log('Snippet:');
        console.log(content.slice(Math.max(0, idx - 500), idx + 500));
      }
    }
  }
}

searchDir(apiDir);
