import os
import re

footer_pattern = re.compile(r'<footer class="footer">.*?</footer>', re.DOTALL)

new_footer = """<footer class="footer">
        <div class="footer-container">
            <div class="footer-info">
                <p><strong>(주)에스지라이뮤</strong> &nbsp;|&nbsp; Tel : 1544-5703 &nbsp;|&nbsp; 팩스 : 051-518-5985 &nbsp;|&nbsp; 점심시간 (12:00~13:00) &nbsp;|&nbsp; E-Mail : limu101@nate.com &nbsp;|&nbsp; Address : 부산광역시 금정구 놀이마당로 29-1 (청룡동)</p>
                <p>대표자명 : 강인숙 &nbsp;|&nbsp; 개인정보취급담당자 : 강인숙 &nbsp;|&nbsp; 사업자번호 : 621-81-42086 &nbsp;|&nbsp; 통신판매업신고번호 : 제 2018-부산금정-0045호</p>
                <p class="copyright">Copyright(c)2026 www.sglimu.com. All right Reserved.</p>
            </div>
        </div>
    </footer>"""

target_dir = r"c:\\Users\\park4\\OneDrive\\Desktop\\test7\\sglimu-test1"

html_files = [f for f in os.listdir(target_dir) if f.endswith(".html")]

print(f"Found HTML files: {html_files}")

count = 0
for filename in html_files:
    filepath = os.path.join(target_dir, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    if footer_pattern.search(content):
        updated_content = footer_pattern.sub(new_footer, content)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(updated_content)
        print(f"Updated footer in {filename}")
        count += 1
    else:
        print(f"No footer found in {filename}")

print(f"Finished updating {count} files.")
