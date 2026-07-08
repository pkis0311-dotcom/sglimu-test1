const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync('index.html', 'utf8');

// Extract aside
const asideMatch = indexHtml.match(/(<aside class="right-fixed-banner">[\s\S]*?<\/aside>)/);
const asideHtml = asideMatch ? asideMatch[1] : '';

// Extract chat window
const chatWindowStart = indexHtml.indexOf('<div class="chat-window" id="chatWindow">');
let chatWindowEnd = indexHtml.indexOf('<script type="module" src="script.js">', chatWindowStart);
if(chatWindowEnd === -1) chatWindowEnd = indexHtml.indexOf('<script src="cart.js">', chatWindowStart);
const chatWindowHtml = indexHtml.substring(chatWindowStart, chatWindowEnd).trim();

const targetFiles = [
    'supplies-arrange.html', 'supplies-protect.html', 'supplies-lend.html', 'sterilizer.html',
    'furniture-koas.html', 'furniture-fomus.html', 'furniture-fursys.html', 'furniture-custom.html'
];

targetFiles.forEach(file => {
    if (!fs.existsSync(file)) {
        console.log(`File not found: ${file}`);
        return;
    }
    let content = fs.readFileSync(file, 'utf8');
    
    // Remove old aside
    content = content.replace(/<aside class="right-fixed-banner">[\s\S]*?<\/aside>/g, '');
    
    // Remove old chat widget/window
    content = content.replace(/<div class="chat-widget">[\s\S]*?<\/button>\s*<div class="chat-window" id="chatWindow">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g, '');
    content = content.replace(/<!-- Chat Widget -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g, '');
    content = content.replace(/<!-- chat-fab .*?-->[\s\S]*?<div class="chat-window" id="chatWindow">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g, '');
    content = content.replace(/<div class="chat-window" id="chatWindow">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g, '');
    
    // Replace double newlines caused by removing
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Insert new aside and chat window before first script tag that usually appears at the end
    const scriptIndex = content.lastIndexOf('<script');
    
    const insertContent = `
    ${asideHtml}

    <!-- Floating Action Button for Chat -->
    <!-- chat-fab 제거됨 (사이드바로 이동) -->

    <!-- Chat Window -->
    ${chatWindowHtml}

    `;
    
    if (scriptIndex !== -1) {
        content = content.slice(0, scriptIndex) + insertContent + content.slice(scriptIndex);
    } else {
        content = content.replace('</body>', `${insertContent}</body>`);
    }
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
});
