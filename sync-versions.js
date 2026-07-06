const fs = require('fs');
const path = require('path');

const mobilePkgPath = path.join(__dirname, 'mobile', 'package.json');
const desktopPkgPath = path.join(__dirname, 'desktop', 'package.json');

const mobilePkg = JSON.parse(fs.readFileSync(mobilePkgPath, 'utf8'));
const desktopPkg = JSON.parse(fs.readFileSync(desktopPkgPath, 'utf8'));

// Take the mobile version as the source of truth
const targetVersion = mobilePkg.version;

let changed = false;

if (desktopPkg.version !== targetVersion) {
  console.log(`Updating desktop version from ${desktopPkg.version} to ${targetVersion}`);
  desktopPkg.version = targetVersion;
  fs.writeFileSync(desktopPkgPath, JSON.stringify(desktopPkg, null, 2) + '\n');
  changed = true;
}

if (!changed) {
  console.log(`Both packages are already at version ${targetVersion}`);
} else {
  console.log('Versions synchronized.');
}
