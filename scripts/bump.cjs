
const fs = require('fs');
const path = require('path');

async function main() {
    try {
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

        // 2. Update Dashboard.jsx
        const dbPath = path.join(__dirname, '../src/pages/Dashboard.jsx');
        let dbContent = fs.readFileSync(dbPath, 'utf8');

        // Find line with version
        // Expected: <p className="text-[10px] text-muted-foreground/60">v2.68.69 - Guest Rules UI</p>
        const oldVerString = `v${oldVersion}`;
        const newVerString = `v${newVersion}`;

        if (dbContent.includes(oldVerString)) {
            dbContent = dbContent.replace(oldVerString, newVerString);
            fs.writeFileSync(dbPath, dbContent);
            console.log(`Updated Dashboard.jsx: ${oldVerString} -> ${newVerString}`);
        } else {
            console.warn(`Warning: Could not find version string "${oldVerString}" in Dashboard.jsx`);
        }

        // 3. Update Login.jsx
        const loginPath = path.join(__dirname, '../src/pages/Login.jsx');
        let loginContent = fs.readFileSync(loginPath, 'utf8');

        if (loginContent.includes(oldVerString)) {
            loginContent = loginContent.replace(oldVerString, newVerString);
            fs.writeFileSync(loginPath, loginContent);
            console.log(`Updated Login.jsx: ${oldVerString} -> ${newVerString}`);
        } else {
            console.warn(`Warning: Could not find version string "${oldVerString}" in Login.jsx`);
        }

    } catch (e) {
        console.error("Error bumping version:", e);
        process.exit(1);
    }
}

main();
