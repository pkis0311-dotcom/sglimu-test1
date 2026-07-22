import os

target_dir = r"c:\Users\park4\OneDrive\Desktop\test7\sglimu-test1\sglimu-test1-f7f80df16df9dd0d0a27af85970c4fb2f22e7ee0"
target_string = "<strong>(주)에스지라이뮤</strong>"
replacement_string = '<img src="assets/logo_green.png" alt="로고" style="height: 1.2em; vertical-align: middle; margin-right: 6px; position: relative; top: -1px;"><strong>(주)에스지라이뮤</strong>'

html_files = [f for f in os.listdir(target_dir) if f.endswith(".html") and f != "admin-manual.html" and f != "admin.html"]

print(f"Target directory: {target_dir}")
print(f"HTML files to process: {len(html_files)}")

updated_count = 0
for filename in html_files:
    filepath = os.path.join(target_dir, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    if target_string in content:
        # Avoid duplicate replacement
        if "logo_green.png" not in content:
            updated_content = content.replace(target_string, replacement_string)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(updated_content)
            print(f"Updated footer logo in {filename}")
            updated_count += 1
        else:
            print(f"Footer logo already updated in {filename}")
    else:
        print(f"Target string not found in {filename}")

print(f"Successfully updated {updated_count} files.")
