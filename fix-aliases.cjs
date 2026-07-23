const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  content = content.replace(/from '#server\//g, "from '~/server/");
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed:', path.relative(process.cwd(), filePath));
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) walkDir(fp);
    else if (f.endsWith('.ts')) fixFile(fp);
  });
}

walkDir('server/api');
walkDir('server/services');
walkDir('server/repositories');
walkDir('server/plugins');
console.log('Done mapping #server to ~/server!');
