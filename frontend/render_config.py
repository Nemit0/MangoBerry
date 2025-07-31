import sys, json, boto3

def main():
    if len(sys.argv) != 4:
        print("Usage: render_config.py <region> <secret_id> <out_path>")
        sys.exit(2)
    region, secret_id, out_path = sys.argv[1], sys.argv[2], sys.argv[3]

    sm = boto3.client("secretsmanager", region_name=region)
    data = sm.get_secret_value(SecretId=secret_id)
    payload = json.loads(data["SecretString"])

    # Prepare ONLY values safe for the browser
    runtime = {
        "REACT_APP_KAKAO_MAP_APP_KEY": payload.get("KAKAO_MAP_APP_KEY") or payload.get("REACT_APP_KAKAO_MAP_API_KEY", "")
        # Add other public keys if you have them, but NEVER put server secrets here.
    }

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("window.RUNTIME_ENV = ")
        json.dump(runtime, f, ensure_ascii=False)
        f.write(";\n")

if __name__ == "__main__":
    main()
