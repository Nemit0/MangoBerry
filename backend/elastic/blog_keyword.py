import json
from collections import Counter
from konlpy.tag import Okt
from wordcloud import WordCloud
import matplotlib.pyplot as plt

# 파일 경로 설정
json_file = r"C:\Users\hi\Downloads\unique_words (1).json"

# 불용어 리스트
stopwords = [
    "요", "먹음", "골목", "산", "때", "주먹", "임", "해먹", "직", "지인", "이자", "도", "듯", "왕","랍니", "뭐",
    "복식", "마을", "대국", "보고", "날", "손", "데", "보기", "먹보", "먹이", "고요", "이기", "은", "거",
    "대표", "인", "사진", "다가", "때문", "중간", "오늘", "산이", "공원", "디지털", "한번", "정도", "인지", "드릴"
]

# 서울 제외 지역
exclude_regions = [
    "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남",
    "전북", "전남", "경북", "경남", "제주", "수원", "성남", "고양", "용인", "창원", "부천", "안산",
    "전주", "청주", "포항", "여수", "김해", "천안", "안양", "평택", "동탄", "군산", "구미", "익산", "김포",
    "의정부", "시흥", "경주", "군포", "광명", "안동", "춘천", "원주", "강릉", "양산", "목포"
]

# 리뷰 키워드
review_keywords = [
    "맛집", "메뉴", "먹", "추천", "맛", "내돈내산", "본점", "후기", "존맛", "식당",
    "맛있", "가성비", "재방문", "베스트", "또간집", "광고아님", "맛도리", "찐", "단골"
]

# 1. 데이터 불러오기
with open(json_file, "r", encoding="utf-8") as f:
    keywords = json.load(f)

# 2. 리뷰 키워드 포함된 데이터만 추출
review_data = [k for k in keywords if any(rk in k for rk in review_keywords)]
print(f"리뷰 관련 데이터 개수: {len(review_data)}개")

# 3. 명사 추출
okt = Okt()
all_nouns = []
for phrase in review_data:
    if isinstance(phrase, str):
        phrase = phrase.strip()
        if phrase:
            try:
                all_nouns.extend(okt.nouns(phrase))
            except Exception:
                continue

# 4. 불용어 및 지역명/1글자 제외
filtered_counter = Counter({
    word: count for word, count in Counter(all_nouns).items()
    if word not in stopwords
    and len(word) > 1
    and not any(region in word for region in exclude_regions)
})

# 5. 상위 N개만 추출 (ex. 500개)
TOP_N = 1000
top_menus = filtered_counter.most_common(TOP_N)

# 6. (1) (단어, 개수) 튜플 리스트 저장
with open("top_menu_candidates.json", "w", encoding="utf-8") as f:
    json.dump(top_menus, f, ensure_ascii=False, indent=2)

# 7. (2) 단어만 리스트로 저장
menu_list = [word for word, count in top_menus]
with open("top_menu_words.json", "w", encoding="utf-8") as f:
    json.dump(menu_list, f, ensure_ascii=False, indent=2)

print(f"\n상위 {TOP_N}개 메뉴/음식 후보:")
print(menu_list[:100])  # 상위 n개 미리보기

print("\n저장 파일: top_menu_candidates.json (튜플 리스트), top_menu_words.json (단어 리스트)")


# 맛집 치킨 본점 내돈내산 떡볶이 양꼬치 서울 고기 만두 삼겹살 전 피자 김밥 부대찌개 보쌈 빵 술집 밥 카페 포차 떡 베이커리 참치
# 호프집 분식 곱창 족발 해장국 케이크 맥주 무한리필 돈가스 돈까스 칼국수 소 마라탕 순대국 초밥 호프 점심 막걸리 생고기 감자탕 샐러드 여의도점
# 커피 고기집 스테이크 존맛 매운맛 회 양 목동점 냉면 바 한식 닭한마리 쌀국수 파스타 분식집 홍대 신촌점 이태원 김치찌개 문래점 버거