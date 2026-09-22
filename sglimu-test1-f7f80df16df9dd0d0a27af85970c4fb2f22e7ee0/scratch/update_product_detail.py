import os
import re

file_path = os.path.join(os.path.dirname(__file__), '..', 'product-detail.html')

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add parseOriginalPrice after parseProductOptions
orig_parse_snippet = '''        function parseProductOptions(product) {
            if (!product) return { colors: '', sizes: '' };
            let colors = product.colors || '';
            let sizes = product.sizes || '';
            
            // colors 컬럼이 없거나 비어있는 경우 description에서 파싱
            if (!colors && product.description) {
                const match = product.description.match(/\\[\\[C:(.*?)\\]\\]/);
                if (match) colors = match[1];
            }
            // sizes 컬럼이 없거나 비어있는 경우 description에서 파싱
            if (!sizes && product.description) {
                const match = product.description.match(/\\[\\[S:(.*?)\\]\\]/);
                if (match) sizes = match[1];
            }
            
            return { colors, sizes };
        }'''

new_parse_snippet = '''        function parseProductOptions(product) {
            if (!product) return { colors: '', sizes: '' };
            let colors = product.colors || '';
            let sizes = product.sizes || '';
            
            // colors 컬럼이 없거나 비어있는 경우 description에서 파싱
            if (!colors && product.description) {
                const match = product.description.match(/\\[\\[C:(.*?)\\]\\]/);
                if (match) colors = match[1];
            }
            // sizes 컬럼이 없거나 비어있는 경우 description에서 파싱
            if (!sizes && product.description) {
                const match = product.description.match(/\\[\\[S:(.*?)\\]\\]/);
                if (match) sizes = match[1];
            }
            
            return { colors, sizes };
        }

        function parseOriginalPrice(product) {
            if (!product) return '';
            if (product.original_price && String(product.original_price).trim() !== '') {
                return String(product.original_price).replace(/[^0-9]/g, '').trim();
            }
            if (product.description) {
                const match = product.description.match(/\\[\\[OP:([\\s\\S]*?)\\]\\]/);
                if (match && match[1]) {
                    return String(match[1]).replace(/[^0-9]/g, '').trim();
                }
            }
            return '';
        }'''

if orig_parse_snippet in content:
    content = content.replace(orig_parse_snippet, new_parse_snippet, 1)
    print("Replaced parseProductOptions")
else:
    print("Could not find parseProductOptions snippet")

# 2. Update priceElem rendering
orig_price_render = '''            const priceElem = document.querySelector('.product-price');
            if (product.price === '전화문의' || !product.price) {
                priceElem.innerHTML = '전화문의';
                window.basePrice = 0;
            } else {
                priceElem.innerHTML = Number(product.price).toLocaleString() + '<span>원</span>';
                window.basePrice = Number(product.price);
            }'''

new_price_render = '''            const priceElem = document.querySelector('.product-price');
            if (product.price === '전화문의' || !product.price) {
                priceElem.innerHTML = '전화문의';
                window.basePrice = 0;
            } else {
                const priceNum = Number(String(product.price).replace(/[^0-9]/g, '')) || 0;
                const origPrice = parseOriginalPrice(product);
                const origNum = origPrice ? (Number(String(origPrice).replace(/[^0-9]/g, '')) || 0) : 0;

                window.basePrice = priceNum;

                if (origNum && priceNum && origNum > priceNum) {
                    const discountRate = Math.round(((origNum - priceNum) / origNum) * 100);
                    priceElem.innerHTML = `
                        <div class="detail-price-box" style="display:flex; flex-direction:column; gap:2px; width:100%;">
                            <div class="detail-orig-price" style="font-size:1.15rem; color:#95a5a6; text-decoration:line-through; font-weight:500;">
                                ${origNum.toLocaleString('ko-KR')}원
                            </div>
                            <div class="detail-sale-row" style="display:flex; align-items:baseline; gap:10px;">
                                <span class="detail-discount-rate" style="font-size:2rem; font-weight:800; color:#111;">${discountRate}%</span>
                                <span class="detail-sale-price" style="font-size:2.5rem; font-weight:800; color:#e74c3c;">${priceNum.toLocaleString('ko-KR')}</span><span style="font-size:1.3rem; font-weight:700; color:#e74c3c;">원</span>
                            </div>
                        </div>
                    `;
                } else {
                    priceElem.innerHTML = priceNum.toLocaleString('ko-KR') + '<span>원</span>';
                }
            }'''

if orig_price_render in content:
    content = content.replace(orig_price_render, new_price_render, 1)
    print("Replaced priceElem rendering")
else:
    print("Could not find priceElem snippet")

# 3. Update recentlyViewed and wishlist to preserve originalPrice
orig_recent_wish = '''                recentItems.unshift({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: displayImg2,
                    timestamp: new Date().getTime()
                });'''

new_recent_wish = '''                recentItems.unshift({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    originalPrice: parseOriginalPrice(product),
                    image: displayImg2,
                    timestamp: new Date().getTime()
                });'''

if orig_recent_wish in content:
    content = content.replace(orig_recent_wish, new_recent_wish, 1)
    print("Replaced recentlyViewed unshift")
else:
    print("Could not find recentlyViewed unshift")

orig_wish_obj = '''                const productObj = {
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: displayImg3,
                    timestamp: new Date().getTime()
                };'''

new_wish_obj = '''                const productObj = {
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    originalPrice: parseOriginalPrice(product),
                    image: displayImg3,
                    timestamp: new Date().getTime()
                };'''

if orig_wish_obj in content:
    content = content.replace(orig_wish_obj, new_wish_obj, 1)
    print("Replaced wishlist productObj")
else:
    print("Could not find wishlist productObj")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Saved product-detail.html successfully!")
