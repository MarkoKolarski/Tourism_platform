import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router";

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
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState<ShoppingCart | null>(null);
  const [tokens, setTokens] = useState<PurchaseToken[]>([]);
  const [transactions, setTransactions] = useState<SagaTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"cart" | "tokens" | "transactions">("cart");
  const [showDevModal, setShowDevModal] = useState(false);

  const API_URL = "/api/purchases-service";

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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  const fetchCart = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/cart`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      setCart(data);
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (itemId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/cart/items/${itemId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
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

  const updateQuantity = async (itemId: number, quantity: number) => {
    if (quantity < 1) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/cart/items/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ quantity })
      });
      
      if (response.ok) {
        fetchCart();
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkout = async () => {
    if (!cart || cart.items.length === 0) {
      alert("Korpa je prazna!");
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ cart_id: cart.id })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Uspešna kupovina! Transaction ID: ${data.transaction_id}`);
        fetchCart();
        fetchTokens();
        fetchTransactions();
        setActiveTab("tokens");
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
        headers: { "Authorization": `Bearer ${token}` }
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
        headers: { "Authorization": `Bearer ${token}` }
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
    if (isAuthenticated && activeTab === "cart") {
      fetchCart();
    }
  }, [isAuthenticated, activeTab]);

  if (isLoading || !user) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                🛒 Moja Korpa
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Ulogovani kao <span className="font-semibold text-purple-600">{user?.username}</span>
              </p>
            </div>
            <Link
              to="/tourist-tours"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← Pregledaj ture
            </Link>
          </div>
        </div>

        {/* Development warning modal */}
        {showDevModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black opacity-40" onClick={() => setShowDevModal(false)} />
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-lg mx-4 p-6 z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Upozorenje (development)</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                Ovo je development funkcionalnost i služi za debagovanje SAGA transakcija.
              </p>
              <div className="flex justify-end space-x-2">
                <button onClick={() => setShowDevModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
                  Otkaži
                </button>
                <button
                  onClick={() => { setShowDevModal(false); setActiveTab("transactions"); fetchTransactions(); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
            🛒 Korpa {cart && cart.items.length > 0 && `(${cart.items.length})`}
          </button>
          <button
            onClick={() => { setActiveTab("tokens"); fetchTokens(); }}
            className={`px-6 py-3 font-medium -mb-px ${
              activeTab === "tokens"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            🎫 Kupljene Ture {tokens.length > 0 && `(${tokens.length})`}
          </button>
          <button
            onClick={() => { setShowDevModal(true); }}
            className={`px-6 py-3 font-medium -mb-px ${
              activeTab === "transactions"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            📊 Istorija
          </button>
        </div>

        {/* Shopping Cart Tab */}
        {activeTab === "cart" && (
          <div>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Učitavanje...</p>
              </div>
            ) : cart && Array.isArray(cart.items) && cart.items.length > 0 ? (
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Cart Items */}
                <div className="lg:col-span-2">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Stavke u korpi
                      </h2>
                      {(() => {
                        const st = statusToSerbian(cart.status);
                        return <span className={`px-3 py-1 rounded-full text-sm ${st.badge}`}>{st.label}</span>;
                      })()}
                    </div>

                    <div className="space-y-4">
                      {cart.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{item.tour_name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {formatPrice(item.tour_price)} po osobi
                            </p>
                            <Link 
                              to={`/tours/${item.tour_id}`}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              Pogledaj turu →
                            </Link>
                          </div>
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-3 mx-4">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1 || loading}
                              className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 disabled:opacity-50"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={loading}
                              className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300"
                            >
                              +
                            </button>
                          </div>

                          <div className="flex items-center space-x-4">
                            <div className="text-xl font-bold text-gray-900 dark:text-white">
                              {formatPrice(item.price)}
                            </div>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              disabled={loading}
                              className="text-red-600 hover:text-red-700 p-2"
                              title="Ukloni iz korpe"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-24">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                      Pregled narudžbine
                    </h3>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>Broj tura:</span>
                        <span>{cart.items.length}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>Ukupno osoba:</span>
                        <span>{cart.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                      </div>
                      <hr className="border-gray-200 dark:border-gray-700" />
                      <div className="flex justify-between text-xl font-bold">
                        <span>Ukupno:</span>
                        <span className="text-purple-600">{formatPrice(cart.total_price)}</span>
                      </div>
                    </div>

                    <button
                      onClick={checkout}
                      disabled={loading || cart.items.length === 0}
                      className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Procesiranje..." : "💳 Završi kupovinu"}
                    </button>
                    
                    <p className="mt-4 text-xs text-gray-500 text-center">
                      Klikom na "Završi kupovinu" prihvatate naše uslove korišćenja
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">🛒</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Vaša korpa je prazna
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Pregledajte dostupne ture i dodajte ih u korpu
                </p>
                <Link
                  to="/tourist-tours"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Pregledaj ture
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tokens Tab */}
        {activeTab === "tokens" && (
          <div>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : Array.isArray(tokens) && tokens.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tokens.map((tkn) => (
                  <div key={tkn.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-2xl">🎫</div>
                      {(() => {
                        const st = statusToSerbian(tkn.is_active);
                        return <span className={`px-2 py-1 rounded text-xs ${st.badge}`}>{st.label}</span>;
                      })()}
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">{tkn.tour_name}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Token:</span>
                        <span className="font-mono text-xs">{tkn.token}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Cena:</span>
                        <span className="font-semibold">{formatPrice(tkn.purchase_price)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Datum:</span>
                        <span>{new Date(tkn.purchased_at).toLocaleDateString('sr-RS')}</span>
                      </div>
                    </div>
                    <Link
                      to={`/tours/${tkn.tour_id}`}
                      className="mt-4 block text-center text-blue-600 hover:underline text-sm"
                    >
                      Pogledaj turu →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">🎫</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Nemate kupljenih tura
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Kupljene ture će se pojaviti ovde
                </p>
                <Link
                  to="/tourist-tours"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Pregledaj ture
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <div className="space-y-6">
            {Array.isArray(transactions) && transactions.length > 0 ? (
              transactions.map((tx) => (
                <div key={tx.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{tx.transaction_id}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(tx.created_at).toLocaleString('sr-RS')}
                      </p>
                    </div>
                    {(() => {
                      const st = statusToSerbian(tx.status);
                      return <span className={`px-3 py-1 rounded-full text-sm ${st.badge}`}>{st.label}</span>;
                    })()}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Završeni koraci:</h4>
                      {Array.isArray(tx.steps_completed) && tx.steps_completed.length > 0 ? (
                        <ul className="space-y-1">
                          {tx.steps_completed.map((step, idx) => (
                            <li key={idx} className="text-sm text-green-600 flex items-center">
                              ✅ {step}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500 italic">Nema završenih koraka</p>
                      )}
                    </div>

                    {Array.isArray(tx.compensation_log) && tx.compensation_log.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Log kompenzacije:</h4>
                        <ul className="space-y-1">
                          {tx.compensation_log.map((log, idx) => (
                            <li key={idx} className="text-sm text-orange-600">• {log}</li>
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
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Nema transakcija
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
