import { Link, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const [hasActiveTour, setHasActiveTour] = useState(false);

  // Check for active tour
  useEffect(() => {
    const checkActiveTour = async () => {
      if (!token || !user || user.role.toLowerCase() !== "turista") {
        setHasActiveTour(false);
        return;
      }
      
      try {
        const response = await fetch("/api/tours-service/tours/execution/active", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        // 204 means no active tour
        if (response.status === 204) {
          setHasActiveTour(false);
          return;
        }
        
        setHasActiveTour(response.ok);
      } catch (error) {
        console.error("Error checking active tour:", error);
        setHasActiveTour(false);
      }
    };

    checkActiveTour();
    
    // Recheck every 30 seconds
    const interval = setInterval(checkActiveTour, 30000);
    return () => clearInterval(interval);
  }, [token, user]);

  const handleLogout = async () => {
    logout();
    // Use replace to prevent going back to authenticated pages
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
                </svg>
                <span className="text-xl font-bold text-gray-900 dark:text-white">Tourism Platform</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              <Link to="/" className="flex flex-col items-center px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group">
                <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🏠</span>
                <span className="text-xs font-medium">Početna</span>
              </Link>
              {isAuthenticated && (
                <>
                  <Link to="/users" className="flex flex-col items-center px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group">
                    <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">👤</span>
                    <span className="text-xs font-medium">Profil</span>
                  </Link>
                  <Link to="/blogs" className="flex flex-col items-center px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group">
                    <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">📖</span>
                    <span className="text-xs font-medium">Blogs</span>
                  </Link>
                  <Link to="/followers" className="flex flex-col items-center px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group">
                    <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🔗</span>
                    <span className="text-xs font-medium">Pratioci</span>
                  </Link>
                  <Link to="/simulator" className="flex flex-col items-center px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group">
                    <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">📍</span>
                    <span className="text-xs font-medium">Simulator</span>
                  </Link>
                  {user?.role.toLowerCase() === "admin" && (
                    <Link to="/admin" className="flex flex-col items-center px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group">
                      <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🛠️</span>
                      <span className="text-xs font-medium">Admin</span>
                    </Link>
                  )}
                  {user?.role.toLowerCase() === "turista" && (
                    <>
                      {hasActiveTour && (
                        <Link to="/tours/active" className="flex flex-col items-center px-3 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors group animate-pulse">
                          <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🚶</span>
                          <span className="text-xs font-medium">Aktivna tura</span>
                        </Link>
                      )}
                      <Link to="/tourist-tours/" className="flex flex-col items-center px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group">
                        <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🗺️</span>
                        <span className="text-xs font-medium">Ture</span>
                      </Link>
                      <Link to="/purchase" className="flex flex-col items-center px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group">
                        <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🛒</span>
                        <span className="text-xs font-medium">Korpa</span>
                      </Link>
                    </>
                  )}
                  {user?.role.toLowerCase() === "vodic" && (
                    <>
                    <Link to="/my-tours" className="flex flex-col items-center px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group">
                      <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">📝</span>
                      <span className="text-xs font-medium whitespace-nowrap">Moje ture</span>
                    </Link>
                    <Link to="/tours/create" className="flex flex-col items-center px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group">
                      <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">✏️</span>
                      <span className="text-xs font-medium whitespace-nowrap">Kreiraj</span>
                    </Link>
                    </>
                  )}
                </>
              )}
              
              <div className="flex items-center space-x-3 pl-4 ml-4 border-l border-gray-200 dark:border-gray-700">
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg">
                      <span className="text-lg">👤</span>
                      <span className="font-medium text-sm">{user?.username}</span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex flex-col items-center px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors group"
                    >
                      <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🚪</span>
                      <span className="text-xs font-medium">Odjava</span>
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 flex items-center gap-2"
                  >
                    <span>🔐</span>
                    <span>Prijavi se</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link to="/" className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                🏠 Početna
              </Link>
              {isAuthenticated && (
                <>
                  <Link to="/users" className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    👤 Profil
                  </Link>
                  <Link to="/blogs" className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    📖 Blogs
                  </Link>
                  <Link to="/followers" className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    🔗 Pratioci
                  </Link>
                  <Link to="/simulator" className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    📍 Simulator
                  </Link>
                  {user?.role.toLowerCase() === "admin" && (
                    <Link to="/admin" className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                      🛠️ Admin
                    </Link>
                  )}
                  {user?.role.toLowerCase() === "turista" && (
                    <>
                      {hasActiveTour && (
                        <Link to="/tours/active" className="block px-3 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 font-medium">
                          🚶 Aktivna tura
                        </Link>
                      )}
                      <Link to="/tourist-tours/" className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                        🗺️ Ture
                      </Link>
                      <Link to="/purchase" className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                        🛒 Korpa
                      </Link>
                    </>
                  )}
                  {user?.role.toLowerCase() === "vodic" && (
                    <>
                    <Link to="/my-tours" className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                      📝 Moje ture
                    </Link>
                    <Link to="/tours/create" className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                      ✏️ Kreiraj turu
                    </Link>
                    </>
                  )}
                </>
              )}
              
              {isAuthenticated ? (
                <>
                  <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                    Ulogovan kao: <span className="font-medium text-blue-600">{user?.username}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 rounded-md text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    🚪 Odjavi se
                  </button>
                </>
              ) : (
                <Link to="/login" className="block px-3 py-2 rounded-md text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium">
                  🔐 Prijavi se
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-600 dark:text-gray-400">
            <p>&copy; 2025 Tourism Platform - Mikroservisna Arhitektura</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
