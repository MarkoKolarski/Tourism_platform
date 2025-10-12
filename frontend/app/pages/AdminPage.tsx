import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  is_blocked: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockingUser, setBlockingUser] = useState<number | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/", { replace: true });
      return;
    }
  }, [user, navigate]);

  // Fetch all users
  useEffect(() => {
    if (!user || user.role !== "admin") return;

    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/v1/users/all", {
          credentials: "include",
        });
        
        if (!response.ok) {
          throw new Error("Greška pri učitavanju korisnika");
        }

        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error("Greška:", error);
        setError("Greška pri učitavanju korisnika");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user]);

  const handleBlockUser = async (userId: number) => {
    if (!user) return;

    try {
      setBlockingUser(userId);
      const response = await fetch(`/api/v1/users/block/${userId}?admin_user_id=${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Greška pri blokiranju korisnika");
      }

      // Update user in local state
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === userId 
            ? { ...u, is_blocked: true, is_active: false }
            : u
        )
      );

      alert("Korisnik je uspešno blokiran!");

    } catch (error) {
      console.error("Greška pri blokiranju:", error);
      alert(error instanceof Error ? error.message : "Greška pri blokiranju korisnika");
    } finally {
      setBlockingUser(null);
    }
  };

  if (!user || user.role !== "admin") {
    return null; // Component is redirecting
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              🛠️ Admin Panel
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Upravljanje korisničkim nalozima - pregled i blokiranje
            </p>
          </div>

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Učitavam korisnike...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Svi korisnici ({users.length})
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Korisničko ime
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Ime i prezime
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Uloga
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Registrovan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Akcije
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {user.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-lg mr-2">👤</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.username}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                          {user.first_name || user.last_name 
                            ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                            : "Nije uneseno"
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === "admin" 
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                              : user.role === "vodic"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" 
                              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          }`}>
                            {user.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.is_blocked 
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          }`}>
                            {user.is_blocked ? "🚫 BLOKIRAN" : "✅ AKTIVAN"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                          {new Date(user.created_at).toLocaleDateString("sr-RS")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {user.role === "admin" ? (
                            <span className="text-gray-400 dark:text-gray-500">
                              Admin nalog
                            </span>
                          ) : user.is_blocked ? (
                            <span className="text-gray-400 dark:text-gray-500">
                              Već blokiran
                            </span>
                          ) : (
                            <button
                              onClick={() => handleBlockUser(user.id)}
                              disabled={blockingUser === user.id}
                              className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                            >
                              {blockingUser === user.id ? "Blokira..." : "🚫 Blokiraj"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {users.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">Nema korisnika za prikaz</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
              ℹ️ Napomene:
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>• Admin nalozi ne mogu biti blokirani</li>
              <li>• Blokirani korisnici ne mogu da se prijave u sistem</li>
              <li>• Lozinke korisnika nisu prikazane iz bezbednosnih razloga</li>
              <li>• Akcija blokiranja je trenutno jednostrana (nema odblokiranja)</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}