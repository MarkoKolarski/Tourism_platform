import requests
import json

BASE_URL = "http://localhost:8002/api/followers"


def print_response(response, title="Response"):
    """Helper funkcija za formatiran prikaz odgovora"""
    print(f"{title}")
    print(f"Status Code: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    except:
        print(f"Response: {response.text}")


def test_health_check():
    """Test health check endpoint-a"""
    print("\nTesting Health Check...")
    response = requests.get("http://localhost:8002/health")
    print_response(response, "Health Check")


def test_create_users():
    """Test kreiranja korisnika"""
    print("\nTesting Create Users...")
    
    users = [
        {"user_id": 1, "username": "marko"},
        {"user_id": 2, "username": "ana"},
        {"user_id": 3, "username": "petar"},
        {"user_id": 4, "username": "jovana"},
        {"user_id": 5, "username": "stefan"}
    ]
    
    for user in users:
        response = requests.post(
            f"{BASE_URL}/users/create",
            params=user
        )
        print_response(response, f"Create User: {user['username']}")


def test_follow():
    """Test follow funkcionalnosti"""
    print("\nTesting Follow...")
    
    follows = [
        {"follower_id": 1, "following_id": 2},  # Marko -> Ana
        {"follower_id": 2, "following_id": 1},  # Ana -> Marko (mutual)
        {"follower_id": 3, "following_id": 1},  # Petar -> Marko
        {"follower_id": 4, "following_id": 1},  # Jovana -> Marko
        {"follower_id": 1, "following_id": 3},  # Marko -> Petar
        {"follower_id": 2, "following_id": 3},  # Ana -> Petar
        {"follower_id": 5, "following_id": 2},  # Stefan -> Ana
    ]
    
    for follow in follows:
        response = requests.post(
            f"{BASE_URL}/follow",
            json=follow
        )
        print_response(response, f"Follow: {follow['follower_id']} -> {follow['following_id']}")


def test_get_followers():
    """Test dobavljanja pratilaca"""
    print("\nTesting Get Followers...")
    
    user_id = 1  # Marko
    response = requests.get(f"{BASE_URL}/followers/{user_id}")
    print_response(response, f"Followers of User {user_id}")


def test_get_following():
    """Test dobavljanja korisnika koje prati"""
    print("\nTesting Get Following...")
    
    user_id = 1  # Marko
    response = requests.get(f"{BASE_URL}/following/{user_id}")
    print_response(response, f"User {user_id} is Following")


def test_get_stats():
    """Test statistike"""
    print("\nTesting Get Stats...")
    
    user_id = 1  # Marko
    response = requests.get(f"{BASE_URL}/stats/{user_id}")
    print_response(response, f"Stats for User {user_id}")


def test_is_following():
    """Test provere praćenja"""
    print("\nTesting Is Following...")
    
    # Marko prati Anu
    response = requests.get(f"{BASE_URL}/is-following/1/2")
    print_response(response, "Is User 1 following User 2?")
    
    # Ana prati Marka
    response = requests.get(f"{BASE_URL}/is-following/2/1")
    print_response(response, "Is User 2 following User 1?")
    
    # Stefan ne prati Marka
    response = requests.get(f"{BASE_URL}/is-following/5/1")
    print_response(response, "Is User 5 following User 1?")


def test_mutual_followers():
    """Test uzajamnih pratilaca"""
    print("\nTesting Mutual Followers...")
    
    user_id = 1  # Marko
    response = requests.get(f"{BASE_URL}/mutual/{user_id}")
    print_response(response, f"Mutual Followers for User {user_id}")


def test_recommendations():
    """Test preporuka za praćenje"""
    print("\nTesting Follow Recommendations...")
    
    user_id = 5  # Stefan
    response = requests.get(f"{BASE_URL}/recommendations/{user_id}?limit=5")
    print_response(response, f"Recommendations for User {user_id}")


def test_unfollow():
    """Test unfollow funkcionalnosti"""
    print("\nTesting Unfollow...")
    
    unfollow = {"follower_id": 1, "following_id": 2}  # Marko prestaje da prati Anu
    response = requests.post(
        f"{BASE_URL}/unfollow",
        json=unfollow
    )
    print_response(response, f"Unfollow: {unfollow['follower_id']} -/-> {unfollow['following_id']}")
    
    # Provera da li je unfollow uspeo
    response = requests.get(f"{BASE_URL}/is-following/1/2")
    print_response(response, "Verification - Is User 1 still following User 2?")


def test_can_read_blog():
    """Test provere da li korisnik može čitati blog"""
    print("\n📖 Testing Can Read Blog (KT2 - 2.2)...")
    
    # Marko (1) prati Anu (2) - može čitati
    response = requests.get(f"{BASE_URL}/can-read-blog/1/2")
    print_response(response, "Can User 1 read User 2's blog? (follows)")
    
    # Stefan (5) ne prati Marka (1) - ne može čitati
    response = requests.get(f"{BASE_URL}/can-read-blog/5/1")
    print_response(response, "Can User 5 read User 1's blog? (doesn't follow)")
    
    # Marko (1) čita svoj blog - može
    response = requests.get(f"{BASE_URL}/can-read-blog/1/1")
    print_response(response, "Can User 1 read own blog?")


def test_can_comment_blog():
    """Test provere da li korisnik može komentarisati blog"""
    print("\nTesting Can Comment Blog (KT2)...")
    
    # Ana (2) prati Marka (1) - može komentarisati
    response = requests.get(f"{BASE_URL}/can-comment-blog/2/1")
    print_response(response, "Can User 2 comment on User 1's blog? (follows)")
    
    # Stefan (5) ne prati Marka (1) - ne može komentarisati
    response = requests.get(f"{BASE_URL}/can-comment-blog/5/1")
    print_response(response, "Can User 5 comment on User 1's blog? (doesn't follow)")


def test_accessible_blogs():
    """Test dobavljanja dostupnih blogova"""
    print("\nTesting Accessible Blogs (KT2 - 2.2)...")
    
    # Blogovi koje Marko (1) može da čita
    response = requests.get(f"{BASE_URL}/accessible-blogs/1")
    print_response(response, "Which blogs can User 1 read?")
    
    # Blogovi koje Stefan (5) može da čita
    response = requests.get(f"{BASE_URL}/accessible-blogs/5")
    print_response(response, "Which blogs can User 5 read?")


def test_who_can_comment():
    """Test ko može komentarisati blogove autora"""
    print("\nTesting Who Can Comment...")
    
    # Ko može komentarisati Markove (1) blogove
    response = requests.get(f"{BASE_URL}/who-can-comment/1")
    print_response(response, "Who can comment on User 1's blogs?")


def run_all_tests():
    """Pokretanje svih testova"""
    print("FOLLOWERS SERVICE - TEST SUITE")

    
    try:
        test_health_check()
        test_create_users()
        test_follow()
        test_get_followers()
        test_get_following()
        test_get_stats()
        test_is_following()
        test_mutual_followers()
        test_recommendations()
        test_can_read_blog()
        test_can_comment_blog()
        test_accessible_blogs()
        test_who_can_comment()
        test_unfollow()
        
        print("ALL TESTS COMPLETED!")

        
    except requests.exceptions.ConnectionError:
        print("\nERROR: Cannot connect to the service!")
        print("Make sure the service is running on http://localhost:8002")
        print("Run: uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload")
    except Exception as e:
        print(f"\nERROR: {e}")


if __name__ == "__main__":
    run_all_tests()
