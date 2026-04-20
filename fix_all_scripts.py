import os

def fix_html_files():
    for filename in os.listdir('.'):
        if filename.endswith('.html'):
            try:
                with open(filename, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Replace module script with standard script
                new_content = content.replace('<script type="module">', '<script>')
                new_content = new_content.replace("import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';", "const { createClient } = supabase;")
                
                if new_content != content:
                    with open(filename, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Fixed: {filename}")
            except Exception as e:
                print(f"Error fixing {filename}: {e}")

if __name__ == "__main__":
    fix_html_files()
