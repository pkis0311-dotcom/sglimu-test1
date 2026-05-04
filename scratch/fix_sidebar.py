import sys

file_path = r'c:\Users\park4\OneDrive\Desktop\test7\sglimu-test1\product-detail.html'

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

# Sidebar replacement (Lines 207-215, which is index 206-214)
sidebar_content = [
    '    <aside class="right-fixed-banner">\n',
    '        <ul class="banner-menu">\n',
    '            <li><a href="#" class="banner-btn search-btn-aside" title="검색"><i class="fa-solid fa-magnifying-glass"></i><span class="tooltip">검색</span></a></li>\n',
    '            <li><a href="#" class="banner-btn" title="주문배송"><i class="fa-solid fa-truck"></i><span class="tooltip">주문배송</span></a></li>\n',
    '            <li><a href="#" class="banner-btn" title="장바구니"><i class="fa-solid fa-cart-shopping"></i><span class="tooltip">장바구니</span></a></li>\n',
    '            <li><a href="#" class="banner-btn" title="관심상품"><i class="fa-regular fa-heart"></i><span class="tooltip">관심상품</span></a></li>\n',
    '            <li><a href="#" class="banner-btn naver-talk" title="네이버톡톡"><i class="fa-solid fa-comment-dots"></i><span class="tooltip">네이버톡톡</span></a></li>\n',
    '            <li class="scroll-btns">\n',
    '                <button class="banner-btn scroll-top" id="scrollTopBtn" title="위로"><i class="fa-solid fa-chevron-up"></i></button>\n',
    '                <button class="banner-btn scroll-bottom" id="scrollBottomBtn" title="아래로"><i class="fa-solid fa-chevron-down"></i></button>\n',
    '            </li>\n',
    '        </ul>\n',
    '    </aside>\n'
]

# We need to find the actual lines since indices might change slightly if I'm not careful.
# But based on the previous view_file, 207-215 is correct.
# However, I should probably search for the start and end of the aside tag.

start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if '<aside class="right-fixed-banner">' in line:
        start_idx = i
    if start_idx != -1 and '</aside>' in line:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    lines[start_idx:end_idx+1] = sidebar_content
    print(f"Replaced sidebar from line {start_idx+1} to {end_idx+1}")
else:
    print("Could not find sidebar aside tag")

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
