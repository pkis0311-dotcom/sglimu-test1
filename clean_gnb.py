import os
import re

# List of files to process
html_files = [
    "index.html", "rfid.html", "em.html", "access.html", 
    "supplies-arrange.html", "supplies-protect.html", "supplies-lend.html",
    "furniture-koas.html", "furniture-fomus.html", "furniture-fursys.html", "furniture-custom.html",
    "sign-class.html", "sign-board.html", "sign-date.html", "sign-custom.html",
    "sterilizer.html", "discount.html"
]

# Patterns
# 1. <li class="has-nested"> -> <li>
# 2. <i class="fa-solid fa-chevron-right" style="font-size:0.7rem;"></i> -> ""
# 3. <ul class="nested-submenu">...</ul> (including the ul itself) -> ""

re_li = re.compile(r'<li class="has-nested">', re.IGNORECASE)
re_icon = re.compile(r'\s*<i class="fa-solid fa-chevron-right" style="font-size:0\.7rem;"><\/i>', re.IGNORECASE)
# Multine matching for nested-submenu ul
re_menu = re.compile(r'\s*<ul class="nested-submenu">.*?<\/ul>', re.DOTALL | re.IGNORECASE)

def process_file(filename):
    if not os.path.exists(filename):
        print(f"Skipping {filename}: Not found")
        return

    print(f"Processing {filename}...")
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Apply removals
    content = re_menu.sub('', content)
    content = re_icon.sub('', content)
    content = re_li.sub('<li>', content)

    # Save back as UTF-8 (No BOM)
    with open(filename, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print(f"Done {filename}")

if __name__ == "__main__":
    for f in html_files:
        process_file(f)
