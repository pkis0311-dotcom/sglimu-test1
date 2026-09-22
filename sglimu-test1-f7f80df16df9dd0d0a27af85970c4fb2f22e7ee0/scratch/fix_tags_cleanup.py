import os

# 1. Update product-detail.html
pd_path = os.path.join(os.path.dirname(__file__), '..', 'product-detail.html')
with open(pd_path, 'r', encoding='utf-8') as f:
    pd_content = f.read()

orig_pd_desc = """            // Description
            const descElem = document.getElementById('dynamicDesc');
            if(descElem && product.description) {
                descElem.innerHTML = product.description.replace(/\\[\\[C:.*?\\]\\]/g, '').replace(/\\[\\[S:.*?\\]\\]/g, '').replace(/\\[\\[K:.*?\\]\\]/g, '').replace(/\\n/g, '<br>').trim();
            }"""

new_pd_desc = """            // Description
            const descElem = document.getElementById('dynamicDesc');
            if(descElem && product.description) {
                descElem.innerHTML = (product.description || '')
                    .replace(/\\[\\[(C|S|K|OP):[\\s\\S]*?\\]\\]/g, '')
                    .trim()
                    .replace(/\\n/g, '<br>');
            }"""

if orig_pd_desc in pd_content:
    pd_content = pd_content.replace(orig_pd_desc, new_pd_desc, 1)
    print("Replaced in product-detail.html")
else:
    # Try finding line
    import re
    match = re.search(r"if\s*\(descElem\s*&&\s*product\.description\)[\s\S]*?\}", pd_content)
    if match:
        pd_content = pd_content[:match.start()] + """if(descElem && product.description) {
                descElem.innerHTML = (product.description || '')
                    .replace(/\\[\\[(C|S|K|OP):[\\s\\S]*?\\]\\]/g, '')
                    .trim()
                    .replace(/\\n/g, '<br>');
            }""" + pd_content[match.end():]
        print("Replaced via regex in product-detail.html")
    else:
        print("Could not match in product-detail.html")

with open(pd_path, 'w', encoding='utf-8') as f:
    f.write(pd_content)


# 2. Update script.js
script_path = os.path.join(os.path.dirname(__file__), '..', 'script.js')
with open(script_path, 'r', encoding='utf-8') as f:
    script_content = f.read()

orig_script_desc = """            // Description
            const descElem = document.getElementById('dynamicDesc');
            if (descElem && data.description) {
                descElem.innerHTML = data.description.replace(/\\n/g, '<br>');
            }"""

new_script_desc = """            // Description
            const descElem = document.getElementById('dynamicDesc');
            if (descElem && data.description) {
                descElem.innerHTML = (data.description || '')
                    .replace(/\\[\\[(C|S|K|OP):[\\s\\S]*?\\]\\]/g, '')
                    .trim()
                    .replace(/\\n/g, '<br>');
            }"""

if orig_script_desc in script_content:
    script_content = script_content.replace(orig_script_desc, new_script_desc, 1)
    print("Replaced in script.js")
else:
    print("Could not find in script.js")

with open(script_path, 'w', encoding='utf-8') as f:
    f.write(script_content)

print("Finished!")
