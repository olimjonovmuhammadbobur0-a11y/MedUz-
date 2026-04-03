const { execSync } = require('child_process');
try {
  const output = execSync('git show HEAD:src/App.tsx').toString();
  const fs = require('fs');
  fs.writeFileSync('original_app.tsx', output);
  console.log('Success');
} catch (e) {
  console.error(e);
}
