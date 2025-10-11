"""
Test endpoints za Purchase Service
Testira sve funkcionalnosti sa SAGA pattern-om
"""

import httpx
import asyncio
import json
from datetime import datetime


BASE_URL = "http://localhost:8003"
API_PREFIX = "/api/purchase"


def print_section(title: str):
    """Print formatiranog naslova"""
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}\n")


async def test_health_check():
    """Test health check endpoint-a"""
    print_section("1. Health Check")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/health")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        assert response.status_code == 200
        print("✅ Health check passed")


async def test_get_cart():
    """Test dobijanja korpe"""
    print_section("2. Get Shopping Cart")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}{API_PREFIX}/cart")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        assert response.status_code == 200
        cart = response.json()
        print(f"✅ Cart retrieved: ID={cart['id']}, Total=${cart['total_price']}")
        
        return cart


async def test_add_to_cart():
    """Test dodavanja tura u korpu"""
    print_section("3. Add Tours to Cart")
    
    tours_to_add = [
        {"tour_id": 1, "quantity": 2},
        {"tour_id": 2, "quantity": 1},
        {"tour_id": 3, "quantity": 3}
    ]
    
    async with httpx.AsyncClient() as client:
        for tour in tours_to_add:
            response = await client.post(
                f"{BASE_URL}{API_PREFIX}/cart/add",
                json=tour
            )
            print(f"Adding Tour {tour['tour_id']}: Status {response.status_code}")
            
            if response.status_code == 201:
                cart = response.json()
                print(f"  ✅ Added! Cart total: ${cart['total_price']}")
            else:
                print(f"  ❌ Failed: {response.text}")
        
        response = await client.get(f"{BASE_URL}{API_PREFIX}/cart")
        cart = response.json()
    
    print(f"\n📊 Final Cart:")
    print(f"  Items: {len(cart['items'])}")
    print(f"  Total: ${cart['total_price']}")
    
    for item in cart['items']:
        print(f"  - {item['tour_name']}: ${item['price']} ({item['quantity']}x)")
    
    return cart


async def test_update_cart_item(cart):
    """Test ažuriranja stavke u korpi"""
    print_section("4. Update Cart Item")
    
    if not cart['items']:
        print("⚠️ No items in cart to update")
        return
    
    item_id = cart['items'][0]['id']
    new_quantity = 5
    
    async with httpx.AsyncClient() as client:
        response = await client.put(
            f"{BASE_URL}{API_PREFIX}/cart/items/{item_id}",
            json={"quantity": new_quantity}
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            item = response.json()
            print(f"✅ Item updated: {item['tour_name']}")
            print(f"  Quantity: {item['quantity']}")
            print(f"  Price: ${item['price']}")
        else:
            print(f"❌ Update failed: {response.text}")


async def test_checkout(cart):
    """Test checkout procesa sa SAGA pattern-om"""
    print_section("5. Checkout Process (SAGA Pattern)")
    
    print(f"🛒 Checking out cart ID: {cart['id']}")
    print(f"💰 Total amount: ${cart['total_price']}")
    print(f"📦 Items: {len(cart['items'])}")
    
    print("\n🚀 Starting SAGA transaction...\n")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{BASE_URL}{API_PREFIX}/checkout",
            json={"cart_id": cart['id']}
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            
            print(f"\n✅ CHECKOUT SUCCESSFUL!")
            print(f"Transaction ID: {result['transaction_id']}")
            print(f"Status: {result['status']}")
            print(f"Total Paid: ${result['total_price']}")
            print(f"\n🎫 Purchase Tokens Generated: {len(result['tokens'])}")
            
            for i, token in enumerate(result['tokens'], 1):
                print(f"\n  Token #{i}:")
                print(f"    ID: {token['id']}")
                print(f"    Token: {token['token']}")
                print(f"    Tour: {token['tour_name']}")
                print(f"    Price: ${token['purchase_price']}")
            
            print(f"\n💬 Message: {result['message']}")
            
            return result
        else:
            print(f"\n❌ CHECKOUT FAILED!")
            error = response.json()
            print(f"Error: {error.get('detail', 'Unknown error')}")
            return None


async def test_get_tokens():
    """Test dobijanja purchase tokena"""
    print_section("6. Get Purchase Tokens")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}{API_PREFIX}/tokens")
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            tokens = response.json()
            print(f"✅ Found {len(tokens)} purchased tours")
            
            for token in tokens:
                print(f"\n  🎫 {token['tour_name']}")
                print(f"     Token: {token['token']}")
                print(f"     Purchased: {token['purchased_at']}")
                print(f"     Price: ${token['purchase_price']}")
        else:
            print(f"❌ Failed to get tokens: {response.text}")


async def test_get_transactions():
    """Test dobijanja SAGA transakcija"""
    print_section("7. Get SAGA Transactions")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}{API_PREFIX}/transactions")
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            transactions = response.json()
            print(f"✅ Found {len(transactions)} transactions")
            
            for txn in transactions:
                print(f"\n  📋 Transaction: {txn['transaction_id']}")
                print(f"     Status: {txn['status']}")
                print(f"     Current Step: {txn.get('current_step', 'N/A')}")
                print(f"     Created: {txn['created_at']}")
                
                if txn.get('error_message'):
                    print(f"     ❌ Error: {txn['error_message']}")
        else:
            print(f"❌ Failed to get transactions: {response.text}")


async def test_clear_cart():
    """Test pražnjenja korpe"""
    print_section("8. Clear Cart")
    
    async with httpx.AsyncClient() as client:
        response = await client.delete(f"{BASE_URL}{API_PREFIX}/cart/clear")
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ {result['message']}")
        else:
            print(f"❌ Failed: {response.text}")


async def run_all_tests():
    """Pokreni sve testove"""
    print("\n" + "=" * 60)
    print("  PURCHASE SERVICE - SAGA PATTERN TEST SUITE")
    print("=" * 60)
    print(f"  Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Base URL: {BASE_URL}")
    print("=" * 60)
    
    try:
        # 1. Health check
        await test_health_check()
        
        # 2. Get empty cart
        cart = await test_get_cart()
        
        # 3. Add tours to cart
        cart = await test_add_to_cart()
        
        # 4. Update cart item
        await test_update_cart_item(cart)
        
        # 5. Get updated cart
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BASE_URL}{API_PREFIX}/cart")
            cart = response.json()
        
        # 6. Checkout with SAGA
        checkout_result = await test_checkout(cart)
        
        # 7. Get purchase tokens
        await test_get_tokens()
        
        # 8. Get SAGA transactions
        await test_get_transactions()
        
        # 9. Clear cart (optional)
        # await test_clear_cart()
        
        print_section("✅ ALL TESTS COMPLETED SUCCESSFULLY!")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(run_all_tests())
