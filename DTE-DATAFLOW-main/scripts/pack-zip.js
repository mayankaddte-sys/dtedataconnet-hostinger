import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const zip = new JSZip();

const excludeDirs = new Set(['node_modules', 'dist', '.git', '.cache']);
const excludeFiles = new Set(['dte-portal-source-code.zip']);

function addDirectory(currentPath, zipFolder) {
  const items = fs.readdirSync(currentPath, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      if (!excludeDirs.has(item.name)) {
        const subFolder = zipFolder.folder(item.name);
        addDirectory(path.join(currentPath, item.name), subFolder);
      }
    } else {
      if (!excludeFiles.has(item.name) && !item.name.endsWith('.zip')) {
        const filePath = path.join(currentPath, item.name);
        const fileContent = fs.readFileSync(filePath);
        zipFolder.file(item.name, fileContent);
      }
    }
  }
}

const rootDir = process.cwd();
console.log('Packaging project from', rootDir);
addDirectory(rootDir, zip);

const publicDir = path.join(rootDir, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const outputPath = path.join(publicDir, 'dte-portal-source-code.zip');

zip.generateAsync({ 
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 9 }
}).then((content) => {
  fs.writeFileSync(outputPath, content);
  const sizeMB = (content.length / (1024 * 1024)).toFixed(2);
  console.log(`Successfully generated: ${outputPath} (${sizeMB} MB)`);
}).catch((err) => {
  console.error('Error generating zip:', err);
  process.exit(1);
});
