import os

file_path = os.path.join(os.path.dirname(__file__), '..', 'search.html')

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

orig_snippet = '''                        const priceStr = (!p.price || p.price === '전화문의') ? '전화문의' : Number(p.price).toLocaleString() + '원';
                        const options = window.parseProductOptions ? window.parseProductOptions(p) : { colors: '', sizes: '' };
                        const optionsHtml = window.renderProductOptionsMarkup ? window.renderProductOptionsMarkup(options.colors, options.sizes) : '';

                        card.innerHTML = `
                            <div class="product-img" style="background-image: url('${displayImg}'); background-size: contain; background-repeat:no-repeat; background-position: center; border-bottom: 1px solid #eee; height: 250px;"></div>
                            <div class="product-info" style="text-align:center; padding:15px;">
                                <h4 style="margin-bottom:8px; font-size:1.1rem;">${p.name}</h4>
                                <p style="color:var(--color-primary); font-weight:bold; margin:0;">${priceStr}</p>
                                ${optionsHtml}
                            </div>
                        `;'''

new_snippet = '''                        const origPrice = window.parseOriginalPrice ? window.parseOriginalPrice(p) : '';
                        const priceMarkup = window.renderProductPriceHtml ? window.renderProductPriceHtml(p.price, origPrice) : ((!p.price || p.price === '전화문의') ? '<p style="color:var(--color-primary); font-weight:bold; margin:0;">전화문의</p>' : `<p style="color:var(--color-primary); font-weight:bold; margin:0;">${Number(p.price).toLocaleString()}원</p>`);
                        const options = window.parseProductOptions ? window.parseProductOptions(p) : { colors: '', sizes: '' };
                        const optionsHtml = window.renderProductOptionsMarkup ? window.renderProductOptionsMarkup(options.colors, options.sizes) : '';

                        card.innerHTML = `
                            <div class="product-img" style="background-image: url('${displayImg}'); background-size: contain; background-repeat:no-repeat; background-position: center; border-bottom: 1px solid #eee; height: 250px;"></div>
                            <div class="product-info" style="text-align:center; padding:15px;">
                                <h4 style="margin-bottom:8px; font-size:1.1rem;">${p.name}</h4>
                                ${priceMarkup}
                                ${optionsHtml}
                            </div>
                        `;'''

if orig_snippet in content:
    content = content.replace(orig_snippet, new_snippet, 1)
    print("Replaced search.html snippet successfully")
else:
    print("Could not find search.html snippet")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
