
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

        // 2. Update Dashboard.jsx
        const dbPath = path.join(__dirname, '../src/pages/Dashboard.jsx');
        let dbContent = fs.readFileSync(dbPath, 'utf8');

        // Find line with version
        // Expected: <p className="text-[10px] text-muted-foreground/60">v2.68.69 - Guest Rules UI</p>
        const oldVerString = `v${oldVersion}`;
        const newVerString = `v${newVersion}`;

        // Regex to replace version AND description: v2.68.251 - .*</p>
        // We look for patterns like: >v2.68.250 - Wipe Fix</p>

        let didUpdate = false;

        // Strategy: First simple replace of version number (legacy compat)
        if (dbContent.includes(oldVerString)) {
            // If we have a commit message, try to update the whole string
            if (commitMsg) {
                // Regex: vOldVersion - CurrentMsg
                // CAUTION: The hyphen might be part of the user manual edits.
                const regex = new RegExp(`v${oldVersion.replace(/\./g, '\\.')}\\s*-\\s*[^<]*`, 'g');
                if (regex.test(dbContent)) {
                    dbContent = dbContent.replace(regex, `${newVerString} - ${commitMsg}`);
                    didUpdate = true;
                }
            }

            // If regex failed or no commit msg, just bump version number
            if (!didUpdate) {
                dbContent = dbContent.replace(oldVerString, newVerString);
            }

            fs.writeFileSync(dbPath, dbContent);
            console.log(`Updated Dashboard.jsx: ${oldVerString} -> ${newVerString} (Msg: ${commitMsg || 'kept'})`);
        } else {
            console.warn(`Warning: Could not find version string "${oldVerString}" in Dashboard.jsx`);
        }

        // 3. Update Login.jsx
        const loginPath = path.join(__dirname, '../src/pages/Login.jsx');
        let loginContent = fs.readFileSync(loginPath, 'utf8');

        if (loginContent.includes(oldVerString)) {
            // Reuse same logic for Login
            let didUpdateLogin = false;
            if (commitMsg) {
                const regex = new RegExp(`v${oldVersion.replace(/\./g, '\\.')}\\s*-\\s*[^<]*`, 'g');
                if (regex.test(loginContent)) {
                    loginContent = loginContent.replace(regex, `${newVerString} - ${commitMsg}`);
                    didUpdateLogin = true;
                }
            }
            if (!didUpdateLogin) {
                loginContent = loginContent.replace(oldVerString, newVerString);
            }

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
