const { execSync } = require('child_process');
const os = require('os');

try {
  const platform = os.platform();
  const arch = os.arch();
  // Only run on linux x64 where Render builds run
  if (platform === 'linux' && arch === 'x64') {
    console.log('Detected linux x64 — attempting to install @rollup/rollup-linux-x64-gnu');
    try {
      execSync('npm i @rollup/rollup-linux-x64-gnu --no-save --no-audit --no-fund', { stdio: 'inherit' });
      console.log('Installed @rollup/rollup-linux-x64-gnu successfully');
    } catch (e) {
      console.warn('Failed to install @rollup/rollup-linux-x64-gnu — proceeding, build may still fail', e && e.message);
    }
  } else {
    console.log(`Platform ${platform}-${arch} — no native rollup install needed`);
  }
} catch (err) {
  console.error('postinstall script failed', err && err.message);
}
