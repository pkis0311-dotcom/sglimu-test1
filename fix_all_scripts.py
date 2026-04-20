import os
import re

directory = '.'
target_files = [f for f in os.listdir(directory) if f.endswith('.html') and f not in ['index.html', 'admin.html', 'check_db.html']]

replacement_pattern = r'<script type="module">\s*import { createClient } from \'https://cdn\.jsdelivr\.net/npm/@supabase/supabase-js/\+esm\';\s*const SUPABASE_URL = \'(.*?)\';\s*const SUPABASE_ANON_KEY = \'(.*?)\';\s*const supabase = createClient\(SUPABASE_URL, SUPABASE_ANON_KEY\);'

replacement_text = r'<script>\n        const { createClient } = supabase;\n        const SUPABASE_URL = "\1";\n        const SUPABASE_ANON_KEY = "\2";\n        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);'

for filename in target_files:
    file_path = os.path.join(directory, filename)
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Replace initialization
    new_content = re.sub(replacement_pattern, replacement_text, content, flags=re.DOTALL)
    
    # 2. Replace supabase.from with supabaseClient.from
    if 'loadProducts' in new_content:
       new_content = new_content.replace('await supabase.from', 'await supabaseClient.from')
       new_content = new_content.replace('loadProducts(cat-tnh', 'loadProducts(access_') # small fixup
       
    if content != new_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed {filename}")
