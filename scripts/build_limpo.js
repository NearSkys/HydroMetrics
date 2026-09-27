const fs = require('fs');
const path = require('path');
const stripComments = require('strip-comments');


const rootDir = path.join(__dirname, '..');
const buildDir = path.join(__dirname, '../build_limpo');


if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true, force: true });
}


fs.mkdirSync(buildDir, { recursive: true });


const items = fs.readdirSync(rootDir);
const ignorar = ['.git', 'node_modules', 'build_limpo', '.env'];

for (const item of items) {
  if (ignorar.includes(item)) continue;
  
  const sourcePath = path.join(rootDir, item);
  const destPath = path.join(buildDir, item);
  
  fs.cpSync(sourcePath, destPath, { recursive: true });
}


function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      
      const cleanedContent = stripComments(content);
      
      
      fs.writeFileSync(fullPath, cleanedContent, 'utf8');
    }
  }
}


processDirectory(buildDir);

console.log('✅ Repositório limpo gerado com sucesso na pasta "build_limpo"!');
