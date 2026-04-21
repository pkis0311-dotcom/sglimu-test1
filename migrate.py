import json
import urllib.request

SUPABASE_URL = 'https://xxvfgnoffomrhtxitqkj.supabase.co'
SUPABASE_ANON_KEY = 'sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9'

HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

SITE_CATEGORIES = {
    'system': {
        'icon': 'fa-server', 'label': '도서관리시스템',
        'subs': [
            { 'id': 'rfid_tag', 'name': 'RFID > 태그 (TAG)' },
            { 'id': 'rfid_anti', 'name': 'RFID > 분실 방지기' },
            { 'id': 'rfid_reader', 'name': 'RFID > 리더기' },
            { 'id': 'rfid_return', name: 'RFID > 대출 반납기' },
            { 'id': 'em_anti', 'name': 'EM > 분실 방지기' },
            { 'id': 'em_gen', 'name': 'EM > 감응제거재생기' },
            { 'id': 'em_tape', 'name': 'EM > 감응 테이프' },
            { 'id': 'access_7000', 'name': '출입관리 > TNH-7000A' },
            { 'id': 'access_8000', 'name': '출입관리 > TNH-8000A' },
            { 'id': 'access_2203', 'name': '출입관리 > EZ-2203AWG' },
            { 'id': 'access_2204', 'name': '출입관리 > EZ-2204AWG' }
        ]
    },
    'supplies': {
        'icon': 'fa-box-open', 'label': '도서관 용품',
        'subs': [
            { 'id': 'supplies_arrange_keeper', 'name': '정리 > 키퍼' },
            { 'id': 'supplies_arrange_label_color', 'name': '정리 > 색띠라벨' },
            { 'id': 'supplies_arrange_label_paper', 'name': '정리 > 라벨용지' },
            { 'id': 'supplies_arrange_gloves', 'name': '정리 > 장갑' },
            { 'id': 'supplies_arrange_stamp', 'name': '정리 > 도장' },
            { 'id': 'supplies_arrange_bookend', 'name': '정리 > 북앤드' },
            { 'id': 'supplies_arrange_etc', 'name': '정리 > 기타' },
            { 'id': 'supplies_protect_filmo', 'name': '보호 > 필모시리즈' },
            { 'id': 'supplies_protect_glue', 'name': '보호 > 중성풀' },
            { 'id': 'supplies_protect_tape', 'name': '보호 > 양면테이프' },
            { 'id': 'supplies_protect_bookcover', 'name': '보호 > 북커버' },
            { 'id': 'supplies_lend_barcode', 'name': '대출 > 바코드' },
            { 'id': 'supplies_lend_equip', 'name': '대출 > 카드프린터/기기' },
            { 'id': 'supplies_lend_card', 'name': '대출 > 회원증카드' },
            { 'id': 'supplies_lend_thermal', 'name': '대출 > 감열지' },
            { 'id': 'sterilizer_parts', 'name': '책소독기 소모품' }
        ]
    },
    'furniture': {
        'icon': 'fa-chair', 'label': '도서관 가구',
        'subs': [
            { 'id': 'koas_shelf', 'name': '코아스 > 서가' },
            { 'id': 'koas_table', 'name': '코아스 > 테이블' },
            { 'id': 'koas_chair', 'name': '코아스 > 의자' },
            { 'id': 'koas_etc', 'name': '코아스 > 기타' },
            { 'id': 'fomus_shelf', 'name': '포머스 > 서가' },
            { 'id': 'fomus_table', 'name': '포머스 > 테이블' },
            { 'id': 'fomus_chair', 'name': '포머스 > 의자' },
            { 'id': 'fomus_etc', 'name': '포머스 > 기타' },
            { 'id': 'fursys_shelf', 'name': '퍼시스 > 서가' },
            { 'id': 'fursys_table', 'name': '퍼시스 > 테이블' },
            { 'id': 'fursys_chair', 'name': '퍼시스 > 의자' },
            { 'id': 'fursys_etc', 'name': '퍼시스 > 기타' }
        ]
    },
    'signage': {
        'icon': 'fa-scroll', 'label': '사인물',
        'subs': [
            { 'id': 'sign_class', 'name': '분류/대분류 표지판' },
            { 'id': 'sign_board', 'name': '게시판/이용안내' },
            { 'id': 'sign_date', 'name': '대출반납일력표' },
            { 'id': 'sign_custom', 'name': '제작 사인물' },
            { 'id': 'best_product', 'name': '메인 베스트 상품' }
        ]
    },
    'discount': {
        'icon': 'fa-tags', 'label': '할인상품',
        'subs': [
            { 'id': 'discount_items', 'name': '할인상품 전체' }
        ]
    }
}

def post_to_supabase(table, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    req = urllib.request.Request(url, data=json.dumps(data).encode(), headers=HEADERS, method='POST')
    try:
        with urllib.request.urlopen(req) as f:
            return f.status, f.read().decode()
    except Exception as e:
        return 500, str(e)

def delete_all_categories():
    url = f"{SUPABASE_URL}/rest/v1/categories?id=neq.temp_id"
    req = urllib.request.Request(url, headers=HEADERS, method='DELETE')
    try:
        with urllib.request.urlopen(req) as f:
            return f.status
    except Exception as e:
        print(f"Delete failed: {e}")
        return 500

def migrate():
    print("Clearing existing categories...")
    delete_all_categories()
    
    major_keys = list(SITE_CATEGORIES.keys())
    for i, major_id in enumerate(major_keys):
        data = SITE_CATEGORIES[major_id]
        print(f"Migrating Major: {data['label']} ({major_id})")
        
        major_payload = {
            "id": major_id,
            "name": data['label'],
            "is_major": True,
            "icon_class": data.get('icon_class', data.get('icon')),
            "display_order": i
        }
        
        status, resp = post_to_supabase('categories', [major_payload])
        if status >= 300:
            print(f"Error inserting major {major_id}: {resp}")
            continue
            
        for j, sub in enumerate(data['subs']):
            print(f"  Migrating Minor: {sub['name']} ({sub['id']})")
            minor_payload = {
                "id": sub['id'],
                "name": sub['name'],
                "parent_id": major_id,
                "is_major": False,
                "display_order": j
            }
            status, resp = post_to_supabase('categories', [minor_payload])
            if status >= 300:
                print(f"  Error inserting minor {sub['id']}: {resp}")

if __name__ == "__main__":
    migrate()
    print("Migration finished!")
