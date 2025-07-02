import sqlite3
from collections import Counter
from konlpy.tag import Okt
import re
import json

def clean_text(text):
    if not text:
        return ""
    text = re.sub('<[^<]+?>', '', text)
    text = re.sub('[^가-힣a-zA-Z0-9 ]', ' ', text)
    text = re.sub('\s+', ' ', text)
    return text.strip()


conn = sqlite3.connect("clean_copy.sqlite")
cursor = conn.cursor()
okt = Okt()

total_counter = Counter()
BATCH_SIZE = 500  # 500~1000으로 시도

for offset in range(0, 5000, BATCH_SIZE):
    cursor.execute(f"SELECT title, text FROM blog_texts LIMIT {BATCH_SIZE} OFFSET {offset};")
    rows = cursor.fetchall()
    all_text = " ".join([clean_text(row[0]) + " " + clean_text(row[1]) for row in rows])
    nouns = okt.nouns(all_text)
    nouns = [n for n in nouns if len(n) > 1 and not n.isdigit()]
    total_counter.update(nouns)

print("\n*** 가장 많이 나온 단어 TOP 100 ***")
for word, count in total_counter.most_common(100):
    print(word, count)

# items / blog_texts의 text / title 에서 검색

# menu_keyword = "치킨"
# query = """
# SELECT title, text
# FROM blog_texts
# WHERE title LIKE ? OR text LIKE ?
# LIMIT 50;
# """
# cursor.execute(query, (f"%{menu_keyword}%", f"%{menu_keyword}%"))
# results = cursor.fetchall()
# for title, text in results:
#     snippet = text[:50] if text else ""
#     print(f"제목: {title}\n내용: {snippet}...\n{'='*30}")
#
#
#
# # item 컬럼에서 메뉴명 검색
#
# menu_keyword = "삼겹살"
# cursor.execute("SELECT items FROM blog_posts LIMIT 200;")
# rows = cursor.fetchall()
#
# for (items_json,) in rows:
#     try:
#         items = json.loads(items_json)
#         for item in items:
#             title = item.get('title', '')
#             if menu_keyword in title:
#                 print(f"포스트 타이틀: {title}")
#     except Exception as e:
#         continue  # 혹시 잘못된 json 있으면 패스
#
# conn.close()



