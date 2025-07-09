import requests

def get_location_from_ip(ip: str):
    try:
        response = requests.get(f"http://ip-api.com/json/{ip}")
        data = response.json()
        print("GeoIP response:", data) 

        if data.get("status") == "success":
            return {"lat": data["lat"], "lon": data["lon"]}
        else:
            print("GeoIP failed:", data.get("message"))
    except Exception as e:
        print("GeoIP exception:", e)

    return None