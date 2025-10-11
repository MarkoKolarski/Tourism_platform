"""
Inicijalizacioni script za Purchase Service
Kreira tabele i ubacuje test podatke u lokalnu PostgreSQL bazu
"""
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import ProgrammingError
from app.core.config import settings
from app.models.purchase import Base, ShoppingCart, OrderItem, TourPurchaseToken, OrderStatus
from app.core.database import SessionLocal
from datetime import datetime


def create_database_if_not_exists():
    """Kreira bazu tourism_purchase ako ne postoji"""
    base_url = settings.database_url.rsplit('/', 1)[0]  # postgresql://postgres:ftn@localhost:5432
    default_db_url = f"{base_url}/postgres"
    
    engine = create_engine(default_db_url, isolation_level="AUTOCOMMIT")
    
    try:
        with engine.connect() as conn:
            # Proveri da li baza postoji
            result = conn.execute(text(
                "SELECT 1 FROM pg_database WHERE datname = 'tourism_purchase'"
            ))
            exists = result.scalar()
            
            if not exists:
                print("📦 Baza 'tourism_purchase' ne postoji - kreiram je...\n")
                conn.execute(text("CREATE DATABASE tourism_purchase ENCODING 'UTF8'"))
                print("✅ Baza 'tourism_purchase' uspešno kreirana!\n")
            else:
                print("✅ Baza 'tourism_purchase' već postoji.\n")
                
    except Exception as e:
        print(f"❌ GREŠKA pri kreiranju baze: {e}")
        sys.exit(1)
    finally:
        engine.dispose()


def init_database():
    """Inicijalizacija baze podataka"""
    print("\n" + "="*70)
    print("  PURCHASE SERVICE - DATABASE INITIALIZATION")
    print("="*70 + "\n")
    
    print(f"📊 Database URL: {settings.database_url}")
    print(f"🔧 Inicijalizacija baze podataka...\n")
    
    # Kreiranje engine-a
    try:
        engine = create_engine(settings.database_url)
        
        # Test konekcije
        with engine.connect() as conn:
            print("✅ Uspešna konekcija sa bazom!\n")
        
    except Exception as e:
        print(f"❌ GREŠKA: Ne mogu se povezati sa bazom!")
        print(f"   Error: {e}")
        print("\n📝 Proveri:")
        print("   1. Da li PostgreSQL radi?")
        print("   2. Da li postoji baza 'tourism_purchase'?")
        print("   3. Da li su kredencijali tačni u .env fajlu?")
        print("\n💡 Kreiraj bazu:")
        print("   psql -U postgres")
        print("   CREATE DATABASE tourism_purchase;")
        sys.exit(1)
    
    # Brisanje starih tabela (OPCIONALNO - samo za development)
    print("⚠️  Brisanje starih tabela (ako postoje)...")
    Base.metadata.drop_all(bind=engine)
    
    # Kreiranje novih tabela
    print("📋 Kreiranje tabela...")
    Base.metadata.create_all(bind=engine)
    
    print("✅ Tabele kreirane:")
    print("   ✓ shopping_carts")
    print("   ✓ order_items")
    print("   ✓ tour_purchase_tokens")
    print("   ✓ saga_transactions")
    
    # Dodavanje test podataka
    add_test_data()
    
    print("\n🎉 Inicijalizacija završena!")
    print("="*70 + "\n")


def add_test_data():
    """Dodavanje test podataka"""
    print("\n📦 Dodavanje test podataka...")
    
    db = SessionLocal()
    
    try:
        # ==================== Test Cart 1 - PENDING ====================
        print("\n1️⃣  Kreiranje test korpe #1 (PENDING)...")
        cart1 = ShoppingCart(
            user_id=1,
            total_price=0.0,
            status=OrderStatus.PENDING
        )
        db.add(cart1)
        db.commit()
        db.refresh(cart1)
        
        # Test Order Items za Cart 1
        item1 = OrderItem(
            cart_id=cart1.id,
            tour_id=1,
            tour_name="Beogradska Tvrđava Tour",
            tour_price=50.0,
            quantity=1,
            price=50.0
        )
        
        item2 = OrderItem(
            cart_id=cart1.id,
            tour_id=2,
            tour_name="Skadarlija Walking Tour",
            tour_price=30.0,
            quantity=2,
            price=60.0
        )
        
        db.add(item1)
        db.add(item2)
        
        # Ažuriranje totala
        cart1.total_price = 110.0
        
        db.commit()
        
        print(f"   ✅ Cart #{cart1.id} kreirana (User 1)")
        print(f"      - Tour: {item1.tour_name} (${item1.price})")
        print(f"      - Tour: {item2.tour_name} (${item2.price})")
        print(f"      - Total: ${cart1.total_price}")
        print(f"      - Status: {cart1.status.value}")
        
        # ==================== Test Cart 2 - COMPLETED ====================
        print("\n2️⃣  Kreiranje test korpe #2 (COMPLETED)...")
        cart2 = ShoppingCart(
            user_id=2,
            total_price=200.0,
            status=OrderStatus.COMPLETED
        )
        db.add(cart2)
        db.commit()
        db.refresh(cart2)
        
        # Test Purchase Token za Cart 2
        token1 = TourPurchaseToken(
            token="TPT-TEST123456ABC",
            user_id=2,
            cart_id=cart2.id,
            tour_id=3,
            tour_name="Avala Tower Tour",
            purchase_price=200.0,
            is_active=OrderStatus.COMPLETED
        )
        db.add(token1)
        db.commit()
        
        print(f"   ✅ Cart #{cart2.id} completed (User 2)")
        print(f"      - Token: {token1.token}")
        print(f"      - Tour: {token1.tour_name}")
        print(f"      - Price: ${token1.purchase_price}")
        
        # ==================== Test Cart 3 - PENDING (Empty) ====================
        print("\n3️⃣  Kreiranje prazne test korpe #3 (PENDING)...")
        cart3 = ShoppingCart(
            user_id=3,
            total_price=0.0,
            status=OrderStatus.PENDING
        )
        db.add(cart3)
        db.commit()
        db.refresh(cart3)
        
        print(f"   ✅ Cart #{cart3.id} kreirana (User 3) - prazna")
        
        print("\n📊 Test podaci uspešno dodati!")
        
    except Exception as e:
        print(f"\n❌ Greška pri dodavanju podataka: {e}")
        db.rollback()
    finally:
        db.close()


def show_database_info():
    """Prikazivanje informacija o bazi"""
    print("\n" + "="*70)
    print("  DATABASE SUMMARY")
    print("="*70)
    
    db = SessionLocal()
    
    try:
        # Count tabela
        carts_count = db.query(ShoppingCart).count()
        items_count = db.query(OrderItem).count()
        tokens_count = db.query(TourPurchaseToken).count()
        
        print(f"\n📊 Statistika:")
        print(f"   Shopping Carts: {carts_count}")
        print(f"   Order Items: {items_count}")
        print(f"   Purchase Tokens: {tokens_count}")
        
        # Prikaz korpi
        print("\n🛒 Shopping Carts:")
        print("   " + "-"*60)
        carts = db.query(ShoppingCart).all()
        for cart in carts:
            print(f"   Cart #{cart.id}:")
            print(f"      User ID: {cart.user_id}")
            print(f"      Total: ${cart.total_price}")
            print(f"      Status: {cart.status.value}")
            print(f"      Items: {len(cart.items)}")
            print()
        
        # Prikaz stavki
        if items_count > 0:
            print("📦 Order Items:")
            print("   " + "-"*60)
            items = db.query(OrderItem).all()
            for item in items:
                print(f"   Item #{item.id}:")
                print(f"      Cart: #{item.cart_id}")
                print(f"      Tour: {item.tour_name}")
                print(f"      Quantity: {item.quantity}")
                print(f"      Price: ${item.price}")
                print()
        
        # Prikaz tokena
        if tokens_count > 0:
            print("🎫 Purchase Tokens:")
            print("   " + "-"*60)
            tokens = db.query(TourPurchaseToken).all()
            for token in tokens:
                print(f"   Token: {token.token}")
                print(f"      User: {token.user_id}")
                print(f"      Tour: {token.tour_name}")
                print(f"      Price: ${token.purchase_price}")
                print(f"      Purchased: {token.purchased_at}")
                print()
        
    except Exception as e:
        print(f"❌ Greška: {e}")
    finally:
        db.close()
    
    print("="*70 + "\n")


if __name__ == "__main__":
    try:
        # Kreiraj bazu ako ne postoji
        create_database_if_not_exists()
        
        # Inicijalizacija
        init_database()
        
        # Prikaži info
        show_database_info()
        
        print("✅ Sve gotovo!")
        print("\n💡 Sledeći koraci:")
        print("   1. Pokreni servis: uvicorn app.main:app --port 8003 --reload")
        print("   2. Testiraj: python test_endpoints.py")
        print("   3. Otvori docs: http://localhost:8003/docs")
        print()
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Prekinuto od strane korisnika.")
    except Exception as e:
        print(f"\n❌ Neočekivana greška: {e}")
        import traceback
        traceback.print_exc()
