import requests
import time
import json
import io

BASE_URL = "http://127.0.0.1:3000"

def run_benchmark():
    print("--- Starting Benchmark ---")
    
    # 1. Upload an asset
    print("\n1. Uploading Asset...")
    files = {'file': ('test.txt', 'This is some test content for caching.')}
    upload_res = requests.post(f"{BASE_URL}/assets/upload", files=files)
    if upload_res.status_code != 201:
        print(f"FAILED: Upload status {upload_res.status_code}")
        return
    
    asset = upload_res.json()
    asset_id = asset['id']
    asset_etag = asset['etag']
    print(f"SUCCESS: Uploaded asset {asset_id} with ETag {asset_etag}")

    # 2. Test Conditional GET (Cache Hit Simulation)
    print("\n2. Testing Conditional GET (Cache Hit Simulation)...")
    hits = 0
    misses = 0
    total_requests = 100

    # First request is a miss (no ETag)
    first_res = requests.get(f"{BASE_URL}/assets/{asset_id}/download")
    if first_res.status_code == 200:
        misses += 1
        print("First request: 200 OK (Cache Miss)")

    # Subsequent requests with ETag
    headers = {'If-None-Match': asset_etag}
    for i in range(total_requests - 1):
        res = requests.get(f"{BASE_URL}/assets/{asset_id}/download", headers=headers)
        if res.status_code == 304:
            hits += 1
        else:
            misses += 1
    
    hit_ratio = (hits / (total_requests)) * 100
    print(f"RESULTS: Total Requests: {total_requests}, Hits: {hits}, Misses: {misses}")
    print(f"Cache Hit Ratio: {hit_ratio:.2f}%")

    # 3. Test Private Access
    print("\n3. Testing Private Access...")
    # Upload a private file
    p_files = {'file': ('private.txt', 'Private content.')}
    p_upload_res = requests.post(f"{BASE_URL}/assets/upload?private=true", files=p_files)
    p_asset = p_upload_res.json()
    p_id = p_asset['id']
    
    # Try download without token
    p_res = requests.get(f"{BASE_URL}/assets/{p_id}/download")
    print(f"Download private (expected headers): {p_res.headers.get('Cache-Control')}")

    # Get token
    token_res = requests.post(f"{BASE_URL}/assets/{p_id}/token")
    token = token_res.json()['token']
    
    # Access with token
    private_res = requests.get(f"{BASE_URL}/assets/private/{token}")
    if private_res.status_code == 200:
        print(f"SUCCESS: Private access with token worked. Content-Type: {private_res.headers.get('Content-Type')}")
    else:
        print(f"FAILED: Private access status {private_res.status_code}")

    # 4. Test Versioning
    print("\n4. Testing Versioning...")
    pub_res = requests.post(f"{BASE_URL}/assets/{asset_id}/publish")
    if pub_res.status_code != 200:
        print(f"FAILED: Publish status {pub_res.status_code}")
        print(f"Response: {pub_res.text}")
        return

    version = pub_res.json()
    v_id = version['versionId']
    v_etag = version['etag']
    
    v_download = requests.get(f"{BASE_URL}/assets/public/{v_id}")
    if v_download.status_code == 200:
        print(f"Versioned access: 200 OK")
        print(f"Cache-Control for versioned: {v_download.headers.get('Cache-Control')}")
    else:
        print(f"FAILED: Versioned download status {v_download.status_code}")

    print("\n--- Benchmark Complete ---")

if __name__ == "__main__":
    try:
        run_benchmark()
    except Exception as e:
        print(f"Benchmark failed: {e}")
