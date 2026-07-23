const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Replace relative imports with alias for services/repositories
  content = content.replace(/from '\.\.\/+services\//g, "from '#server/services/");
  content = content.replace(/from '\.\.\/+repositories\//g, "from '#server/repositories/");
  content = content.replace(/from '\.\.\/+models\//g, "from '#server/models/");

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
console.log('All imports fixed!');
