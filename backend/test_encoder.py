import requests
import json

# Test health
print("Testing health endpoint...")
health_response = requests.get("http://localhost:8000/api/health")
print(f"Health: {health_response.json()}\n")

# Test encoding
print("Testing encode endpoint with somber-manas.m4a...")
with open("test_audio/somber-manas.m4a", "rb") as f:
    files = {"file": ("somber-manas.m4a", f, "audio/m4a")}
    response = requests.post("http://localhost:8000/api/encode", files=files)

if response.status_code == 200:
    data = response.json()
    print(f"✅ Success!")
    print(f"Codebook levels: {len(data['codebook_indices'])}")
    print(f"Frames per level: {[len(level) for level in data['codebook_indices']]}")
    print(f"Duration: {data['audio_metadata']['duration']:.2f}s")
    print(f"Compression ratio: {data['compression_metrics']['compression_ratio']:.4f}")
    print(f"Bits/second: {data['compression_metrics']['bits_per_second']:.0f}")
    
    # Save full response for inspection
    with open("test_response.json", "w") as out:
        json.dump(data, out, indent=2)
    print(f"\nFull response saved to test_response.json")
else:
    print(f"❌ Error: {response.status_code}")
    print(response.text)