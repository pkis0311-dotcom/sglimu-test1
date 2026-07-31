import os

keywords = ["3M라벨키퍼", "책꽂이라벨", "라벨키퍼"]
root_dir = r"c:\Users\park4\OneDrive\Desktop\sglimu-test1-74cb15a05cf7228d7666fb5324167b503300e79d\1\sglimu-test1\sglimu-test1-f7f80df16df9dd0d0a27af85970c4fb2f22e7ee0"

for root, dirs, files in os.walk(root_dir):
    if "scratch" in root or ".git" in root or "node_modules" in root:
        continue
    for file in files:
        if file.endswith((".html", ".js", ".css", ".json")):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    lines = f.readlines()
                    for idx, line in enumerate(lines):
                        for kw in keywords:
                            if kw in line:
                                print(f"{file}:{idx+1} | {kw} | {line.strip()}")
            except Exception as e:
                # Try with cp949 if utf-8 fails
                try:
                    with open(filepath, "r", encoding="cp949") as f:
                        lines = f.readlines()
                        for idx, line in enumerate(lines):
                            for kw in keywords:
                                if kw in line:
                                    print(f"{file}:{idx+1} | {kw} | {line.strip()}")
                except Exception as e2:
                    pass
