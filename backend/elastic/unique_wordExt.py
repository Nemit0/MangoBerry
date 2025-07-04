import json
import re
from collections import Counter
from konlpy.tag import Okt
from wordcloud import WordCloud
import matplotlib.pyplot as plt

# 0. 설정
json_file = r"C:\Users\hi\Downloads\unique_words (1).json"
stopwords = [ "요","먹음","골목","산","때","주먹","임","해먹","직","지인","이자","도","듯","왕","랍니","뭐",
              "복식","마을","대국","보고","날","손","데","보기","먹보","먹이","고요","이기","은","거",
              "대표","인","사진","다가","때문","중간","오늘","산이","공원","디지털","한번","정도","인지","드릴" ]
exclude_regions = [ # 서울 외 지역
    "부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남",
    "전북","전남","경북","경남","제주","수원","성남","고양","용인","창원","부천","안산",
    "전주","청주","포항","여수","김해","천안","안양","평택","동탄","군산","구미","익산","김포",
    "의정부","시흥","경주","군포","광명","안동","춘천","원주","강릉","양산","목포"
]
review_keywords = [
    "맛집","메뉴","먹","추천","맛","내돈내산","본점","후기","존맛","식당",
    "맛있","가성비","재방문","베스트","또간집","광고아님","맛도리","찐","단골"
]
target_districts = ["영등포구", "마포구", "용산구", "동작구"]

# 1. 원본 키워드 로딩
with open(json_file, "r", encoding="utf-8") as f:
    keywords = json.load(f)

# 2. 1차: 리뷰 키워드 포함된 데이터만
review_data = [k for k in keywords if isinstance(k,str) and any(rk in k for rk in review_keywords)]

# 3. 2차: 위치 필터 (구명 또는 “ㅇㅇ동” 패턴)
loc_data = [
    phrase for phrase in review_data
    if any(d in phrase for d in target_districts)
       or re.search(r'\w+동', phrase)
]

print(f"▶ 리뷰+위치 필터링 결과: {len(loc_data)}개")

# 4. 형태소 분석으로 명사만 추출
okt = Okt()
all_nouns = []
for phrase in loc_data:
    try:
        all_nouns.extend(okt.nouns(phrase))
    except Exception:
        continue

# 5. 불용어·지역명·한 글자 제외
filtered_counts = Counter({
    w: c for w,c in Counter(all_nouns).items()
    if w not in stopwords
       and len(w)>1
       and not any(reg in w for reg in exclude_regions)
})

# 6. 상위 N개 추출
TOP_N = 500
top_menus = filtered_counts.most_common(TOP_N)

# 7. JSON 저장 (한 줄에 ["단어", 개수] 형식)
with open("top_menu_candidates.json", "w", encoding="utf-8") as f:
    f.write("[\n")
    for word, cnt in top_menus:
        f.write(f'  ["{word}", {cnt}],\n')
    f.write("]\n")

# 8. 메뉴 단어 리스트 저장
menu_words = [w for w,_ in top_menus]
with open("top_menu_words.json", "w", encoding="utf-8") as f:
    json.dump(menu_words, f, ensure_ascii=False)

print(f"▶ 상위 {TOP_N}개 후보 예시:\n{menu_words[:30]}")

# 9. 워드클라우드 생성
wc = WordCloud(
    font_path="malgun.ttf",
    background_color="white",
    width=800,
    height=400
)
wc.generate_from_frequencies(dict(top_menus))

plt.figure(figsize=(12,6))
plt.imshow(wc, interpolation="bilinear")
plt.axis("off")
plt.tight_layout()
plt.show()
