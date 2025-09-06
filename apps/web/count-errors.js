const { execSync } = require('child_process');

try {
  const output = execSync('npx tsc --noEmit', { encoding: 'utf8', stdio: 'pipe' });
  console.log('0 errors found');
} catch (error) {
  const stderr = error.stderr || error.stdout || '';
  const lines = stderr.split('\n');
  const foundLine = lines.find(line => line.includes('Found') && line.includes('error'));
  
  if (foundLine) {
    console.log(foundLine);
  } else {
    // Count individual error lines
    const errorLines = lines.filter(line => line.includes('error TS'));
    console.log(`Found ${errorLines.length} errors`);
  }
}