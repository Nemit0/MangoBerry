import os
import requests

from dotenv import load_dotenv

load_dotenv(os.path.dirname(os.path.dirname(__file__)) + '/.env')

kakao_api_key = os.getenv('KAKAO_MAP_APP_KEY')

print(kakao_api_key)

keyword = '딸부자네'



##카카오 API
## region에는 '성산일출봉 전기충전소' 검색명이 들어갈 것임
## page_num은 1~3이 입력될 건데, 한 페이지 당 검색목록이 최대 15개임.
## 만약 page_num이 4이상이 되면 3페이지랑 같은 15개의 결과 값을 가져옴. 그래서 1~3만 쓰는 것임
## 입력 예시 -->> headers = {"Authorization": "KakaoAK f221u3894o198123r9"}
## ['meta']['total_count']은 내가 '성산일출봉 전기충전소'를 검색했을 때, 나오는 총 결과 값. 
## ['meta']['total_count']이 45보다 크면 45개만 가져오게 됨


def elec_location(region,page_num):
    url = 'https://dapi.kakao.com/v2/local/search/keyword.json'
    params = {'query': region,'page': page_num}
    headers = {"Authorization": f"KakaoAK {kakao_api_key}"}

    places = requests.get(url, params=params, headers=headers).json()['documents']
    total = requests.get(url, params=params, headers=headers).json()['meta']['total_count']
    if total > 45:
        print(total,'개 중 45개 데이터밖에 가져오지 못했습니다!')
    else :
        print('모든 데이터를 가져왔습니다!')
    return places

if __name__ == '__main__':
    region = keyword
    page_num = 1
    places = elec_location(region, page_num)
    for place in places:
        print(place)
        print('-----------------------------------')
    print('총', len(places), '개의 장소가 검색되었습니다.')
    print('-----------------------------------')