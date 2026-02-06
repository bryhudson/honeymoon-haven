
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        const commitMsg = process.argv[2] || '';

        // 1. Update package.json
        const pkgPath = path.join(__dirname, '../package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const oldVersion = pkg.version;
        const versionParts = oldVersion.split('.').map(Number);
        versionParts[2]++; // Increment patch
        const newVersion = versionParts.join('.');
        pkg.version = newVersion;
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
        console.log(`Bumped package.json: ${oldVersion} -> ${newVersion}`);

        // 2. Updated Dashboard.jsx and Login.jsx (Logic now uses __APP_VERSION__ global)
        console.log(`Note: Dashboard.jsx and Login.jsx now use __APP_VERSION__ global. No literal replacement needed.`);

    } catch (e) {
        console.error("Error bumping version:", e);
        process.exit(1);
    }
}

main();
