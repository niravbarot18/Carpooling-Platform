import requests

# Test login for john
login_url = "http://localhost:8000/api/login/"
wallet_url = "http://localhost:8000/api/wallet/"

login_res = requests.post(login_url, json={"username": "john", "password": "john123"})
if login_res.status_code == 200:
    access_token = login_res.json()["access"]
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Check GET /api/wallet/
    wallet_res = requests.get(wallet_url, headers=headers)
    print("STATUS:", wallet_res.status_code)
    print("WALLET RESPONSE:", wallet_res.json())
else:
    print("LOGIN FAILED:", login_res.status_code, login_res.text)
