"""
Test script za GET /api/users/{user_id} endpoint
"""

import httpx
import asyncio


BASE_URL = "http://localhost:8001"


async def test_get_user():
    """Test GET user endpoint"""
    
    print("🧪 Testing Stakeholders Service - GET /api/users/{user_id}")
    print("=" * 60)
    
    async with httpx.AsyncClient() as client:
        # Test za user_id = 1
        for user_id in [1, 2, 3]:
            print(f"\n📋 Testing user_id={user_id}...")
            
            try:
                response = await client.get(f"{BASE_URL}/api/users/{user_id}")
                
                print(f"Status Code: {response.status_code}")
                
                if response.status_code == 200:
                    user = response.json()
                    print(f"✅ User found!")
                    print(f"   ID: {user['id']}")
                    print(f"   Username: {user['username']}")
                    print(f"   Email: {user['email']}")
                    print(f"   Role: {user['role']}")
                    print(f"   Is Active: {user['is_active']}")
                    print(f"   Is Blocked: {user['is_blocked']}")
                else:
                    print(f"❌ Status: {response.status_code}")
                    print(f"   Response: {response.json()}")
                    
            except Exception as e:
                print(f"❌ Error: {e}")
        
        # Test za nepostojeći user
        print(f"\n📋 Testing non-existent user (id=999)...")
        try:
            response = await client.get(f"{BASE_URL}/api/users/999")
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 404:
                print("✅ Correctly returns 404 for non-existent user")
            else:
                print(f"Response: {response.json()}")
                
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print("\n" + "=" * 60)
    print("✅ Test completed!")


if __name__ == "__main__":
    asyncio.run(test_get_user())
