const fs = require('fs');
const path = require('path');

const keywords = ["3M라벨키퍼", "책꽂이라벨", "라벨키퍼"];
const rootDir = "c:\\Users\\park4\\OneDrive\\Desktop\\sglimu-test1-74cb15a05cf7228d7666fb5324167b503300e79d\\1\\sglimu-test1\\sglimu-test1-f7f80df16df9dd0d0a27af85970c4fb2f22e7ee0";

function search(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'scratch' && file !== 'supabase') {
                search(fullPath);
            }
        } else if (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.json')) {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                const lines = content.split('\n');
                lines.forEach((line, idx) => {
                    for (const kw of keywords) {
                        if (line.includes(kw)) {
                            console.log(`${path.relative(rootDir, fullPath)}:${idx + 1} | ${kw} | ${line.trim()}`);
                        }
                    }
                });
            } catch (e) {
                // ignore
            }
        }
    }
}

search(rootDir);
