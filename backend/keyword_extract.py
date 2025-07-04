import sys
import os
import json

from openai import OpenAI

from scipy.spatial.distance import cosine
from scipy.stats import percentileofscore
from openai import OpenAI
from dotenv import load_dotenv
from typing import List, Dict, Any
from pathlib import Path

load_dotenv()
if not os.getenv("OPENAI_API_KEY"):
    raise EnvironmentError("OPENAI_API_KEY not set in environment variables.")

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

MAX_TOKEN_FOR_MINI_MODEL: int = 10000000
MAX_TOKEN_FOR_REGULAR_MODEL: int = 1000000
    
def extract_keyword_from_review(review:Dict[str, Any]) -> List[str]:
    """
    review schema:
    {
        "name": "Restaurant Name",
        "one_liner": ""
        "text": "Full blog post body in Korean"
    }
    """
    messages = [
        {
            "role": "system",
            "content": r"""You are an assistant that extracts sentiment-tagged keywords from Korean restaurant review.

Task:
1. You will receive a JSON object with the fields:
   - "name": restaurant name  
   - "one_liner": short summary  
   - "body": full review text  

2. Read the “body” (and, if helpful, the “one_liner”) and identify keywords related to:
   • Food descriptions (e.g., “매콤”, “진한 국물”, “알싸한 향”)  
   • Atmosphere or service (e.g., “혼밥하기 좋음”, “웨이팅”)  
   • Other notable details that influence a guest’s experience  

3. For each keyword, decide whether it is used in a **positive** or **negative** context.  
   • Positive = the writer expresses satisfaction or praise.  
   • Negative = the writer expresses disappointment, lack, or complaint.  

4. Return ONLY a JSON object with a single key `"keywords"`.  
   Each value in the `"keywords"` array is an object with:  
```json
{
 "keyword": "<keyword>",
 "sentiment": "positive" | "negative"
}"""
        },
        {
            "role": "user",
            "content": r"""{ "name": "멘노야지 강남본점", "one_liner": "매콤한 돈코츠라멘이 인상적인 혼밥하기 좋은 라멘집", "body": "매운 라멘을 좋아하는데 강남역 근처에 정말 매운 라멘집을 찾던 중 발견한 곳. 돈코츠라멘, 모츠라멘이랑 해장라멘 등 종류가 많았지만 돈코츠라멘에 매운 옵션이 가능해서 먹었는데 기대한 것 만큼 맵지는 않았지만 챠슈에서 나는 진한 불향과 목이버섯의 아삭한 식감, 다진 마늘의 알싸한 향이랑 진한 국물이 어울러져서 좋았다. 매운 옵션이 하나 들어가기보다는 고운 고춧가루를 구비해서 더 넣을수 있게 해도 좋았겠지만 일단 만족. 다만 피크타임에는 웨이팅이 좀 있는 듯 하다. 대략 12~1시 쯤. 혼밥하기에 좋은게 바형식으로 테이블이 있음.​" }"""
        },
        {
            "role": "assistant",
            "content": r"""{{
  "keywords": [
    {"keyword": "매콤", "sentiment": "positive"},
    {"keyword": "진한 불향", "sentiment": "positive"},
    {"keyword": "아삭한 식감", "sentiment": "positive"},
    {"keyword": "알싸한 향", "sentiment": "positive"},
    {"keyword": "진한 국물", "sentiment": "positive"},
    {"keyword": "맵지 않음", "sentiment": "negative"},
    {"keyword": "고춧가루 추가 필요", "sentiment": "negative"},
    {"keyword": "웨이팅", "sentiment": "negative"},
    {"keyword": "혼밥하기 좋음", "sentiment": "positive"},
    {"keyword": "바형 테이블", "sentiment": "positive"}
  ]
}"""
        }
    ]
    input = {
        "name": review["name"],
        "one_liner": review["one_liner"],
        "body": review["text"]
    }
    messages.append({
        "role": "user",
        "content": json.dumps(input, ensure_ascii=False)
    })

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=messages
    )

    try:
        response_json = json.loads(response.choices[0].message.content)
    except json.JSONDecodeError:
        print("Error decoding JSON response:", response.choices[0].message.content)
        return []
    
    if "keywords" not in response_json:
        print("No 'keywords' key found in response:", response_json)
        return []
    
    return response_json["keywords"]