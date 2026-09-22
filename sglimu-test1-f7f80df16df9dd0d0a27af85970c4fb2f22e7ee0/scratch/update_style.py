import os

file_path = os.path.join(os.path.dirname(__file__), '..', 'style.css')

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

orig_css = '''.product-price {
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--color-primary);
    margin-bottom: 40px;
    display: flex;
    align-items: center;
}

.product-price span {
    font-size: 1.2rem;
    font-weight: 500;
    margin-left: 5px;
}'''

new_css = '''.product-price {
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--color-primary);
    margin-bottom: 30px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
}

.product-price span {
    font-size: 1.2rem;
    font-weight: 500;
    margin-left: 5px;
}

/* Discount & Price Styles */
.product-card-price-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: 4px 0 2px 0;
}

.product-card-orig-price {
    font-size: 0.85rem;
    color: #95a5a6;
    text-decoration: line-through;
    font-weight: 500;
    line-height: 1.2;
}

.product-card-sale-price {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    line-height: 1.3;
    margin-top: 2px;
}

.product-discount-rate {
    font-size: 1.05rem;
    font-weight: 800;
    color: #111;
}

.product-final-price {
    font-size: 1.15rem;
    font-weight: 800;
    color: #e74c3c;
}

.detail-price-box {
    display: flex;
    flex-direction: column;
    gap: 3px;
    width: 100%;
}

.detail-orig-price {
    font-size: 1.15rem;
    color: #95a5a6;
    text-decoration: line-through;
    font-weight: 500;
    line-height: 1.2;
}

.detail-sale-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
    line-height: 1.2;
}

.detail-discount-rate {
    font-size: 2rem;
    font-weight: 800;
    color: #111;
}

.detail-sale-price {
    font-size: 2.5rem;
    font-weight: 800;
    color: #e74c3c;
}'''

if orig_css in content:
    content = content.replace(orig_css, new_css, 1)
    print("Replaced CSS successfully")
else:
    print("Could not find CSS snippet")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
