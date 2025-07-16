import json
import sys
from typing import Dict, List

import requests

# ───────────────────────────────────────────────────────────────────────────────
# 1. CONFIGURATION
# ───────────────────────────────────────────────────────────────────────────────
BACKEND = "http://10.241.144.46:8000"
ANALYZE_ENDPOINT = f"{BACKEND}/analyze_review"
CREATE_REVIEW_ENDPOINT = f"{BACKEND}/reviews"
HEADERS = {"accept": "application/json", "Content-Type": "application/json"}

# ───────────────────────────────────────────────────────────────────────────────
# 2. RAW REVIEW DATA
#    • user_id  → 작성자
#    • restaurant_id (r_id) → 대상 식당 ID
#    • restaurant_name → 이름
#    • one_liner → 한줄평
#    • review → 본문
# ───────────────────────────────────────────────────────────────────────────────
REVIEWS: List[Dict] = [
    {
        "user_id": 9,
        "restaurant_id": 449351,
        "restaurant_name": "멘노야지 강남본점",
        "one_liner": "매콤한 돈코츠라멘이 인상적인 혼밥하기 좋은 라멘집",
        "review": """
매운 라멘을 좋아하는데 강남역 근처에 정말 매운 라멘집을 찾던 중 발견한 곳. 돈코츠라멘, 모츠라멘이랑 해장라멘 등 종류가 많았지만 돈코츠라멘에 매운 옵션이 가능해서 먹었는데 기대한 것 만큼 맵지는 않았지만 챠슈에서 나는 진한 불향과 목이버섯의 아삭한 식감, 다진 마늘의 알싸한 향이랑 진한 국물이 어울러져서 좋았다. 매운 옵션이 하나 들어가기보다는 고운 고춧가루를 구비해서 더 넣을수 있게 해도 좋았겠지만 일단 만족. 다만 피크타임에는 웨이팅이 좀 있는 듯 하다. 대략 12~1시 쯤. 혼밥하기에 좋은게 바형식으로 테이블이 있음.
""",
    },
    {
        "user_id": 9,
        "restaurant_id": 350512,
        "restaurant_name": "마유유 마라탕 강남역점",
        "one_liner": "향은 좋지만 뭔가 심심한 우육탕면",
        "review": """
개인적으로 고추기름과 마라유를 넣어서 매콤하게 먹는 우육탕면을 좋아하는데 강남역 근처에 그런 곳이 있을 까 할고 찾아보다가 마라탕집에서 우육탕면이 있다길래 혹시 기대하고 갔다. 마라탕집에도 별도 마라유랑 고추기름이 구비되어 있는 곳이 흔하지는 않아서 기대는 크게 하지 않았지만 역시는 역시였다.. 그래도 깔끔하고 담백한 우육탕면 육수랑 면은 맛있었다.
""",
    },
    {
        "user_id": 9,
        "restaurant_id": 478330,
        "restaurant_name": "딸부자네불백 강남역9번출구점",
        "one_liner": "맛있는 제육 한상차림.",
        "review": """
분명 프랜차이즈이지만 수상적을 정도로 강남역 근처에 지점이 많은 딸부자네불백. 2023년도에는 딸불백정식이 9천원정도로 나쁘지 않았던거같은데 어느새 가격이 11000원까지 올라갔다.. 딸불백정식을 시키면 기본적으로 밥과 반찬들, 된장찌개와 빨간 제육볶음이 나온다. 양파랑 같이 볶아지다가 볶은 팬 그대로 나오는 제육은 약간 매콤하면서도 달짝지근해서 같이 나오는 쌈채소랑 밥이랑 먹기에 좋았다. 물론 아무래도 밖에서 사먹는 제육이다보니 좀 달짝지근한 맛이 있었지만 거슬릴 정도는 아니였다. 밥이랑 고기를 먹다가 남은 밥을 짭조롬한 된장찌개에 말아먹으면 맛있다. 다만 역시 강남역 근처라 피크타임에는 좀 웨이팅이 있을수 있지만 24시간 영업하는 곳이라 아침에 가면 널널함.
""",
    },
    {
        "user_id": 9,
        "restaurant_id": 669141,
        "restaurant_name": "쿠리",
        "one_liner": "깔끔하고 담백한 일식 가정식",
        "review": """
마포구청역과 망원 중간쯤에 위치한 한적하고 동네 맛집 느낌의 일식 가정식 전문점. 메뉴는 고등어구이정식, 조림, 히레카츠정식, 가라아게정식 등 다양하게 있었다. 나는 가지볶음이 있길래 궁금해서 검색해봤는데 과하게 익히면 가지가 너무 흐물흐물해져서 좋아하지 않는데 어느정도 씹는 식감이 있는게 딱 좋았다. 근데 내 입맛에는 약간 과하게 달짝지근한 느낌이 있어서 다음에는 아마 히레카츠정식을 먹어볼 듯.. 같이 나오는 장국은 그냥 무난하고 담백한 맛이였고 그 외에는 무난.
""",
    },
    {
        "user_id": 9,
        "restaurant_id": 378942,
        "restaurant_name": "코코이찌방야 강남점",
        "one_liner": "정신차려보니 4일 연속으로 점심을 먹은 건에 관하여...",
        "review": """
강남에 카레를 메인으로 하는 곳이 여기 말고는 없는 것 같아 갔다. 첫날에는 사람이 한산에 1인석으로 시켰다. 음식이 나오고 카레와 밥을 섞은 다음 테이블에 배치되어 있는 단무지 같은 것과 같이 먹었는데 조합이 매우 좋았다. 단무지를 왕창 접시에 퍼서 밥이랑 같이 퍼 먹었다. 이 조합과 카레 맛에 빠져 4일 연속으로 점심을 여기서 먹은 것 같다. 플레인, 포크샤브, 비프샤브 카레가 맛있는 것 같다.
""",
    },
    {
        "user_id": 5,
        "restaurant_id": 662849,
        "restaurant_name": "춘리마라탕 강남점",
        "one_liner": "저렴하고 빠르게 먹기 좋은 1인 마라탕",
        "review": """
원하는 재료를 내가 고르고 맵기도 조절할 수 있어서 좋았다. 재료의 무게만큼 가격이 측정되는 거여서 내가 다 먹을 수 있는 만큼만 골라 담으니 남기지도 않고 가격도 저렴했다. 만원이 넘지 않은 가격이었다. 매운 거를 잘 먹는 편이 아니라 1단계 맵기로 선택했더니 정말 딱 적당히 매운 맛이었다. 내가 고른 재료는 감자, 옥수수 치즈 떡, 치즈 떡, 연근, 어묵, 숙주나물, 배추, 소고기 조금, 양고기 조금이었다. 다른 재료들은 평범했는데, 옥수수 치즈 떡이 맛있었다. 떡 안에 치즈랑 콘 옥수수가 들어가서 특이했다. 그리고 마라탕 외에 밥도 무료로 제공을 해서 좋았다. 음식도 빠르게 나오는 편이었다.
""",
    },
    {
        "user_id": 5,
        "restaurant_id": 669142,
        "restaurant_name": "을지다락 강남역",
        "one_liner": "약간 가격대 있지만 퓨전 양식 먹기 무난한 곳",
        "review": """
들깨 파스타를 먹었는데 파스타 면에 들깨가루가 얹어지고 자른 깻잎이 올라 간 한식 양식 퓨전이었다. 맛은 양식인듯 한식인듯 조금 특이하면서도 너무 생소하지는 않아서 맛있게 먹었다. 너무 푹 삶은 면은 안 좋아하는데 면 익힘 정도가 적당했고 깻잎과 들깨가루 덕분에 전체적으로 고소했다.음식점의 인테리어도 밝고 깔끔하고 넓었다. 특히 음식점 들어가는 입구가 특이했는데 엘레베이터 문같이 생긴 곳이 음식점 입구였다. 요즘 테이블 위에 있는 조그만 키오스트 같은 걸로 주문하고 계산하는 음식점들이 많은데, 여기는 테이블 위에 조그만 종이 있어서 정말 그 종을 울려야 직원 분이 오신다. 다음에는 다른 메뉴를 먹어보고 싶다.
""",
    },
    {
        "user_id": 6,
        "restaurant_id": 581199,
        "restaurant_name": "이차돌 플러스 동탄북광장점",
        "one_liner": "시간 상관 없이 저렴하게 고기 먹기 좋은 곳",
        "review": """
다른 이차돌 체인점과 다른 점은 24시간 영업이라는 점이다. 브레이크 타임도 없이 24시간 영업이라는 점은 바쁜 현대인들 입장에서 자유롭게 식사시간 약속을 잡기 좋다고 생각했다. 고기가 다른 고깃집에 비해 상대적으로 저렴한 편인데, 고기의 질이 떨어진다고 느끼지 못할 정도로 정말 맛있었다. 아쉬웠던 점은 테이블마다 있는 키오스크로 주문하는 방식인데 원하는 음식을 다시 한 번 음성을 말씀드려야 가져다주셨다. 홀이 그렇게 바쁘지 않았는데 불편함을 느낀 것은 고객응대 방면에서 조금 미흡했다고 생각한다. 그래도 맛있어서 또 가고 싶다.
""",
    },
    {
        "user_id": 6,
        "restaurant_id": 669145,
        "restaurant_name": "풀오브어스 역북",
        "one_liner": "샐러드 싫어하는 다이어터들도 부담없이 먹을 수 있는 포케",
        "review": """
다른 지역에 사는 근처 친구들도 여기 포케가 제일 맛있다고 할 정도로 다양한 소스, 신선한 야채, 목살이나 연어 등 여러 메뉴가 있어서 자주 먹을 수 있다. 일단 가게 인테리어가 인스타 감성 카페 느낌이라 여자분들이 더 좋아하실 거 같다. 디저트로 그릭요거트나 과일도 있어서 즐겁게 다이어트할 수 있다. 이제까지 여러번 가봤는데 아쉬운 점은 발견하지 못했다.
""",
    },
    {
        "user_id": 6,
        "restaurant_id": 669143,
        "restaurant_name": "중경마라탕 강남역점",
        "one_liner": "마라탕 말고도 다양한 중국요리를 맛볼 수 있는 가게",
        "review": """
생각보다 강남에서 술집이 아닌 밥집 중 오래하는 곳이 많이 없어서 찾게 된 식당이었는데 기대 이상이었다. 마라탕과 크림새우, 꿔바로우를 먹어보았는데 맛이 전체적으로 깔끔하고 평균은 치는 거 같다. 하지만 마라탕 가격은 100g 2200원이면 저렴하진 않은 거 같다. 매장이 넓고 12시까지 영업을 하셔서 단체로 오셔서 술과 함께 드시는 분들도 계셨다. 다음에 또 방문할 의향이 있다.
""",
    },
    {
        "user_id": 7,
        "restaurant_id": 450013,
        "restaurant_name": "샐러디 역삼점",
        "one_liner": "건강한데 맛있는 맛",
        "review": """
학원 끝나고 배는 고픈데 입맛도 없고 땡기는 게 없어서 찾은 메뉴! 샐러디에서 주로 랩만 먹어봤었는데 포케볼은 첨 먹어봤다.
빵은 싫고 밥은 먹고 싶어서 결정한 메뉴였는데 성공적,,  사실 훈제오리 포스트를 보고 간 거였는데 없어서 슬펐지만 로스트삼겹으로 선택했다. 소스는 여러가지 있는데 그냥 추천되어있는 걸로 체크했다. 근데 나는 소스 별로 안 좋아해서 조금만 뿌려보고 그냥 원래대로 먹었다. 느타리 버섯이 너무 맛있었고 로스트 삼겹도 무난했다. 어떤 부위는 괜찮았는데 비계 부분은 조금 냄새가 났던 점 빼곤,, 재방문해서 다른 메뉴 먹어볼 의향 있따
""",
    },
    {
        "user_id": 7,
        "restaurant_id": 669144,
        "restaurant_name": "라장양갈비양꼬치 무한리필",
        "one_liner": "냄새도 안 나고 가성비 좋음",
        "review": """
얼마 전부터 양꼬치가 먹고 싶었는데 학원 끝나고 우연히 먹게 됐다. 무한리필집 안 간지 오래됐는데 괜찮다고 해서 가게 됐었다. 요즘 1인분에 15000원은 기본으로 하는데 여긴 인 당 23900원에 작은 요리도 선택할 수 있었다. 원하는 만큼 가져다먹는 구조였고 만석이었다. 몰랐는데 시간 제한도 있었다. 근데 시간이 모자라거나 하진 않았고 양껏 즐길 수 있었다. 웨이팅도 있어서 가려면 7시 이전 방문해야할 것 같았다. 냄새도 안 나고 회전률이 좋아서 그런지 상태들이 좋았다. 새우, 단호박, 마라양꼬치 등등 종류 다양하고 많았다.
""",
    },
    {
        "user_id": 8,
        "restaurant_id": 436948,
        "restaurant_name": "정돈 강남점",
        "one_liner": "비싼 가격대이지만 그 값을 해내는 식당",
        "review": """
평일 점심에 갔는데 테이블이 가득 차 있었다. 다행히 한 자리가 비어 바로 들어가 앉을 수 있었다. 안심과 등심 돈카츠 두 개 중에 뭘로 먹을 까 고민하다가 등심이 여기 ‘정돈’의 시그니처 메뉴라고 해서 등심 돈카츠로 시켰다. 그리고 한정 메뉴인 ‘카츠 산도’도 같이 시켰다. 사람이 많아서 그런 지 아니면 주문한 즉시 요리에 들어가서 그런 지 다른 식당과 달린 요리가 나오는 데 좀 걸렸다. 먼저 카츠 산도가 나오고 좀 후에 등심 돈카츠가 나왔다. 먼저 등심 돈카츠부터 먹었다. 진짜 부드럽고 육즙이 가득했다. 너무 맛있었다. 밥도 다른 식당에 비해 좀 더 많이 나왔고 같이 나온 반찬도 정말 돈카츠에 맞는 반찬이었다. 그 중에서 특히 샐러드가 소스와 잘 어울려서 입맛 돋우기에 딱 맞았다. 고추 짱아찌 같은 반찬도 있었는 데 그것도 어울리고 맛잇었다. 돈카츠를 찍어먹는 소스는 와사비, 일반 소금, 트러플 소금이 있었는 데 다 좋았다. 카츠산도는 환상적이었다. 가운데 있는 돈카츠와 그것을 감싸는 식빵, 이 둘의 조합이 매우 잘 맞았다. 3개의 식감의 비슷하여 하나의 재료만을 먹는 느낌이 들어 진짜 맛있게 먹었다. 하지만 가격대가 좀 있지만 그 값을 내고 먹을 만한 식당이다. 사람이 많은 것에는 이유가 있다. 특히 평일 점심 시간대 인데 말이다.
""",
    },
    {
        "user_id": 8,
        "restaurant_id": 443607,
        "restaurant_name": "모퉁이집",
        "one_liner": "가성비 집",
        "review": """
지나가다 본 식당이다. 밖에는 먹방 유튜버 '쯔양'의 사진이 걸려 있어 검색보니 쯔양이 왔다간 식당 중 하나였다. 10000원에 제육덮밥과 라면을 먹을 수 있어서 해당 세트로 시켰다. 제육덮밥은 단 맛이 강했고 라면은 아무래도 세트 메뉴이고 가격대가 낮다보니 라면스프맛이 강하지는 않았다. 강남에 이런 분식집 느낌이 나는 곳이 적은 데 그 가운데 모퉁이집이 그 역할을 하고 있고 가격대도 착하고 세트메뉴가 있어 가성비 있게 먹기에 좋은 것 같다.
""",
    },
]

def analyze_keywords(item: Dict, retry: int = 3) -> Dict[str, List[str]]:
    """
    Call /analyze_review and split returned keywords into positive / negative.
    """
    payload = {
        "name": item["restaurant_name"],
        "one_liner": item["one_liner"],
        "text": item["review"],
    }
    while retry > 0:
        try:
            resp = requests.post(ANALYZE_ENDPOINT, headers=HEADERS, json=payload, timeout=15)
            resp.raise_for_status()
            keywords = json.loads(resp.text)
            if not keywords:
                raise ValueError("No keywords found")
            break
        except requests.RequestException as exc:
            print(f"[ERROR] analyze_review failed for {item['restaurant_name']}: {exc}")
            retry -= 1
            if retry == 0:
                return {"positive": [], "negative": []}
        except ValueError as ve:
            print(f"[ERROR] analyze_review returned empty for {item['restaurant_name']}: {ve}")
            retry -= 1
            if retry == 0:
                return {"positive": [], "negative": []}

    sentiments = resp.json()
    positive = [s["keyword"] for s in sentiments if s.get("sentiment") == "positive"]
    negative = [s["keyword"] for s in sentiments if s.get("sentiment") == "negative"]
    return {"positive": positive, "negative": negative}


def post_review(item: Dict, kws: Dict[str, List[str]]) -> None:
    """
    Persist the final review to /reviews.
    """
    print(f"[INFO] Posting review for {item['restaurant_name']} (r_id={item['restaurant_id']})")
    print(json.dumps(kws, indent=2, ensure_ascii=False))
    review_payload = {
        "user_id": item["user_id"],
        "restaurant_id": item["restaurant_id"],
        "comments": item["one_liner"],
        "review": item["review"],
        "photo_filenames": ["/test/single/final_logo.jpg"],
        "photo_urls": ["https://mangoberry-bucket.s3.ap-northeast-2.amazonaws.com/test/single/final_logo.jpg"],
        "positive_keywords": kws["positive"],
        "negative_keywords": kws["negative"],
    }
    try:
        resp = requests.post(
            CREATE_REVIEW_ENDPOINT, headers=HEADERS, json=review_payload, timeout=15
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        print(f"[ERROR] review POST failed for {item['restaurant_name']}: {exc}")
        return

    print(
        f"[OK] {item['restaurant_name']} (r_id={item['restaurant_id']}) "
        f"uploaded → review_id={resp.json().get('review_id', 'N/A')}"
    )

def main() -> None:
    print(f"Uploading {len(REVIEWS)} reviews to {BACKEND} …\n")
    for idx, review in enumerate(REVIEWS, start=1):
        print(f"({idx}/{len(REVIEWS)}) Processing: {review['restaurant_name']}")
        keyword_split = analyze_keywords(review)
        post_review(review, keyword_split)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit("\nInterrupted by user")