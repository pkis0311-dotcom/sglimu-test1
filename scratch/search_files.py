import os

def search_in_files(search_str):
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith(('.html', '.js', '.css', '.py', '.ps1')):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        if search_str in f.read():
                            print(f"Found in: {path}")
                except:
                    try:
                        with open(path, 'r', encoding='cp949') as f:
                            if search_str in f.read():
                                print(f"Found in: {path} (cp949)")
                    except:
                        pass

if __name__ == "__main__":
    search_in_files("서가샘플상품")
    search_in_files("서가")
