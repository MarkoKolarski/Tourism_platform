import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";

interface CartItem {
  id: number;
  tour_id: number;
  tour_name: string;
  tour_price: number;
  quantity: number;
  price: number;
}

interface ShoppingCart {
  id: number;
  user_id: number;
  total_price: number;
  status: string;
  items: CartItem[];
}

interface PurchaseToken {
  id: number;
  token: string;
  tour_id: number;
  tour_name: string;
  purchase_price: number;
  purchased_at: string;
  is_active: boolean;
}

interface SagaTransaction {
  id: number;
  transaction_id: string;
  status: string;
  current_step: string;
  steps_completed: string[];
  compensation_log: string[];
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export default function PurchasePage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState<ShoppingCart | null>(null);
  const [tokens, setTokens] = useState<PurchaseToken[]>([]);
  const [transactions, setTransactions] = useState<SagaTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"cart" | "tokens" | "transactions">("cart");
  const [showDevModal, setShowDevModal] = useState(false);

  const API_URL = "/api/purchases-service";

  // Map backend status values to Serbian labels and badge classes
  const statusToSerbian = (status: string | boolean | undefined) => {
    const s = String(status ?? '').toLowerCase();
    switch (s) {
      case 'pending':
        return { label: 'Na čekanju', badge: 'badge-warning' };
      case 'processing':
        return { label: 'U obradi', badge: 'badge-info' };
      case 'completed':
        return { label: 'Završeno', badge: 'badge-success' };
      case 'failed':
        return { label: 'Neuspešno', badge: 'badge-danger' };
      case 'cancelled':
        return { label: 'Otkazano', badge: 'badge-secondary' };
      case 'true':
      case 'active':
        return { label: 'Aktivan', badge: 'badge-success' };
      case 'false':
      case 'inactive':
        return { label: 'Neaktivan', badge: 'badge-danger' };
      default:
        return { label: String(status), badge: 'badge-primary' };
    }
  };

  // Redirect if not authenticated
  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

  const fetchCart = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/cart`, {
        headers: { "Authorization": `Bearer ${user?.token}` }
      });
      const data = await response.json();
      setCart(data);
    } catch (error) {
      console.error("Error fetching cart:", error);
      alert("Greška pri učitavanju korpe");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (tourName: string, price: number, quantity: number) => {
    setLoading(true);
    try {
      // Automatski odabir sledećeg dostupnog Tour ID-a
      const nextTourId = cart && cart.items.length > 0 
        ? Math.max(...cart.items.map(item => item.tour_id)) + 1 
        : 1;
      
      const response = await fetch(`${API_URL}/cart/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user?.token}`
        },
        body: JSON.stringify({ 
          tour_id: nextTourId, 
          tour_name: tourName,
          tour_price: price,
          quantity 
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCart(data);
        alert("Tura dodata u korpu!");
      } else {
        const error = await response.json();
        alert(`Greška: ${error.detail}`);
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert("Greška pri dodavanju u korpu");
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (itemId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/cart/items/${itemId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${user?.token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCart(data);
      }
    } catch (error) {
      console.error("Error removing from cart:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkout = async () => {
    if (!cart) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user?.token}`
        },
        body: JSON.stringify({ cart_id: cart.id })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Uspešna kupovina! Transaction ID: ${data.transaction_id}`);
        fetchCart();
        fetchTokens();
        fetchTransactions();
      } else {
        const error = await response.json();
        alert(`Greška: ${error.detail}`);
      }
    } catch (error) {
      console.error("Error during checkout:", error);
      alert("Greška pri checkout-u");
    } finally {
      setLoading(false);
    }
  };

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/tokens`, {
        headers: { "Authorization": `Bearer ${user?.token}` }
      });
      const data = await response.json();
      setTokens(data);
    } catch (error) {
      console.error("Error fetching tokens:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/transactions`, {
        headers: { "Authorization": `Bearer ${user?.token}` }
      });
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Automatski učitaj cart kada se komponenta mountuje
  useEffect(() => {
    if (activeTab === "cart") {
      fetchCart();
    }
  }, []);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                🛒 Kupovina
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Shopping korpa - Ulogovani kao <span className="font-semibold text-purple-600">{user?.username}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Development warning modal for Transactions */}
        {showDevModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black opacity-40" onClick={() => setShowDevModal(false)} />
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-lg mx-4 p-6 z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Upozorenje (development)</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                Ovo je development funkcionalnost i služi za debagovanje SAGA transakcija. U produkciji bi
                ova poruka i alatke trebalo da budu uklonjene.
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowDevModal(false)}
                  className="btn btn-secondary"
                >
                  Otkaži
                </button>
                <button
                  onClick={() => { setShowDevModal(false); setActiveTab("transactions"); fetchTransactions(); }}
                  className="btn btn-primary"
                >
                  Nastavi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => { setActiveTab("cart"); fetchCart(); }}
            className={`px-6 py-3 font-medium -mb-px ${
              activeTab === "cart"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            🛒 Korpa
          </button>
          <button
            onClick={() => { setActiveTab("tokens"); fetchTokens(); }}
            className={`px-6 py-3 font-medium -mb-px ${
              activeTab === "tokens"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            🎫 Moji Tokeni
          </button>
          <button
            onClick={() => { setShowDevModal(true); }}
            className={`px-6 py-3 font-medium -mb-px ${
              activeTab === "transactions"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            📊 Istorija Kupovina
          </button>
        </div>

        {/* Shopping Cart Tab */}
        {activeTab === "cart" && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Add to Cart Form */}
            <div className="lg:col-span-1">
              <div className="card sticky top-24">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Dodaj u Korpu
                </h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    addToCart(
                      formData.get("tourName") as string,
                      parseFloat(formData.get("price") as string),
                      parseInt(formData.get("quantity") as string)
                    );
                    e.currentTarget.reset();
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Naziv Ture
                    </label>
                    <input type="text" name="tourName" className="input" placeholder="Tour #1" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Cena
                    </label>
                    <input type="number" name="price" step="0.01" className="input" defaultValue="100.00" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Količina
                    </label>
                    <input type="number" name="quantity" className="input" defaultValue="1" min="1" required />
                  </div>
                  <button type="submit" disabled={loading} className="btn btn-primary w-full">
                    Dodaj u Korpu
                  </button>
                </form>
              </div>
            </div>

            {/* Cart Display */}
            <div className="lg:col-span-2">
              {cart && Array.isArray(cart.items) && cart.items.length > 0 ? (
                <div className="card">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Vaša Korpa
                    </h2>
                    {(() => {
                      const st = statusToSerbian(cart.status);
                      return <span className={`badge ${st.badge}`}>{st.label}</span>;
                    })()}
                  </div>

                  <div className="space-y-4">
                    {cart.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{item.tour_name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            ${item.tour_price.toFixed(2)} x {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-xl font-bold text-gray-900 dark:text-white">
                            ${item.price.toFixed(2)}
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-xl font-bold text-gray-900 dark:text-white">Ukupno:</span>
                      <span className="text-2xl font-bold text-purple-600">${cart.total_price.toFixed(2)}</span>
                    </div>
                    <button
                      onClick={checkout}
                      disabled={loading}
                      className="btn btn-success w-full text-lg"
                    >
                      {loading ? "Procesiranje..." : "Kupi Sada"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card text-center py-12">
                  <div className="text-6xl mb-4">🛒</div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Korpa je Prazna
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Dodajte ture u korpu da biste započeli kupovinu
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tokens Tab */}
        {activeTab === "tokens" && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(tokens) && tokens.length > 0 ? (
              tokens.map((token) => (
                <div key={token.id} className="card">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-2xl">🎫</div>
                    {(() => {
                      const st = statusToSerbian(token.is_active);
                      return <span className={`badge ${st.badge}`}>{st.label}</span>;
                    })()}
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">{token.tour_name}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Token:</span>
                      <span className="font-mono text-xs text-gray-900 dark:text-white">{token.token}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Cena:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">${token.purchase_price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Datum:</span>
                      <span className="text-gray-900 dark:text-white">{new Date(token.purchased_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full card text-center py-12">
                <div className="text-6xl mb-4">🎫</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Nema Tokena
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Završite kupovinu da dobijete tokene
                </p>
              </div>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <div className="space-y-6">
            {Array.isArray(transactions) && transactions.length > 0 ? (
              transactions.map((tx) => (
                <div key={tx.id} className="card">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{tx.transaction_id}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(tx.created_at).toLocaleString()}
                      </p>
                    </div>
                    {(() => {
                      const st = statusToSerbian(tx.status);
                      return <span className={`badge ${st.badge}`}>{st.label}</span>;
                    })()}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Završeni Koraci:</h4>
                      {Array.isArray(tx.steps_completed) && tx.steps_completed.length > 0 ? (
                        <ul className="space-y-1">
                          {tx.steps_completed.map((step, idx) => (
                            <li key={idx} className="text-sm text-green-600 dark:text-green-400 flex items-center">
                              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              {step}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">Nema završenih koraka</p>
                      )}
                    </div>

                    {Array.isArray(tx.compensation_log) && tx.compensation_log.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Log Kompenzacije:</h4>
                        <ul className="space-y-1">
                          {tx.compensation_log.map((log, idx) => (
                            <li key={idx} className="text-sm text-orange-600 dark:text-orange-400">• {log}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {tx.error_message && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                      <p className="text-sm text-red-800 dark:text-red-200">{tx.error_message}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="card text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Nema Transakcija
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Vaše transakcije će se prikazati ovde
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
