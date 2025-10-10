# Test script za lokalno pokretanje i testiranje
# Pokretaj ovaj fajl da bi testirao endpoints

import requests
import json

BASE_URL = "http://localhost:8001"

def test_health():
    """Test health endpoints"""
    print("=== TESTING HEALTH ENDPOINTS ===")
    
    # Test root endpoint
    response = requests.get(f"{BASE_URL}/")
    print(f"GET / - Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()
    
    # Test health endpoint
    response = requests.get(f"{BASE_URL}/health")
    print(f"GET /health - Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_user_registration():
    """Test user registration"""
    print("=== TESTING USER REGISTRATION ===")
    
    # Test 1: Register tourist
    tourist_data = {
        "username": "pera123",
        "email": "pera@example.com",
        "password": "sigurna123",
        "role": "turista"
    }
    
    response = requests.post(f"{BASE_URL}/api/users/register", json=tourist_data)
    print(f"POST /api/users/register (tourist) - Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()
    
    # Test 2: Register guide
    guide_data = {
        "username": "marko_vodic",
        "email": "marko@guide.com",
        "password": "vodic123",
        "role": "vodic"
    }
    
    response = requests.post(f"{BASE_URL}/api/users/register", json=guide_data)
    print(f"POST /api/users/register (guide) - Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()
    
    # Test 3: Try to register admin (should fail)
    admin_data = {
        "username": "admin_test",
        "email": "admin@test.com",
        "password": "admin123",
        "role": "admin"
    }
    
    response = requests.post(f"{BASE_URL}/api/users/register", json=admin_data)
    print(f"POST /api/users/register (admin - should fail) - Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()
    
    # Test 4: Try duplicate username
    duplicate_data = {
        "username": "pera123",  # Same as first user
        "email": "pera2@example.com",
        "password": "druga123",
        "role": "turista"
    }
    
    response = requests.post(f"{BASE_URL}/api/users/register", json=duplicate_data)
    print(f"POST /api/users/register (duplicate username) - Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_profile_update():
    """Test profile update"""
    print("=== TESTING PROFILE UPDATE ===")
    
    # Update profile for user ID 1
    profile_data = {
        "first_name": "Petar",
        "last_name": "Petrović",
        "biography": "Volim da putujem po Srbiji i otkrivam nova mesta.",
        "motto": "Putuj, uči, uživaj!",
        "profile_image": "https://example.com/avatar.jpg"
    }
    
    response = requests.put(f"{BASE_URL}/api/users/1/profile", json=profile_data)
    print(f"PUT /api/users/1/profile - Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()
    
    # Test partial update
    partial_data = {
        "motto": "Nova mudrola za život!"
    }
    
    response = requests.put(f"{BASE_URL}/api/users/1/profile", json=partial_data)
    print(f"PUT /api/users/1/profile (partial) - Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def run_all_tests():
    """Pokretaj sve testove"""
    try:
        test_health()
        test_user_registration()
        test_profile_update()
        print("=== SVI TESTOVI ZAVRŠENI ===")
    except requests.exceptions.ConnectionError:
        print("GREŠKA: Ne mogu da se povežem sa servisom!")
        print("Proverite da li je servis pokrenut na http://localhost:8001")
    except Exception as e:
        print(f"GREŠKA: {str(e)}")

if __name__ == "__main__":
    run_all_tests()
