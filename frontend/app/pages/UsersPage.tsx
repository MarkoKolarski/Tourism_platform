import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  biography?: string;
  is_blocked: boolean;
}

export default function UsersPage() {
  const { user: currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const API_URL = "http://localhost:8001/api/users";

  // Redirect if not authenticated
  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

  // Load current user's profile on mount
  useEffect(() => {
    const fetchMyProfile = async () => {
      if (currentUser?.id) {
        setLoading(true);
        try {
          const response = await fetch(`${API_URL}/${currentUser.id}`);
          const data = await response.json();
          setSelectedUser(data);
        } catch (error) {
          console.error("Error fetching user:", error);
          alert("Greška pri učitavanju profila");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchMyProfile();
  }, [currentUser?.id]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                👥 Stakeholders Service
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Upravljanje korisnicima - Ulogovani kao <span className="font-semibold text-blue-600">{currentUser?.username}</span>
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="badge badge-success">Port 8001</div>
              <div className="badge badge-primary">PostgreSQL</div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Profile Card */}
          {loading ? (
            <div className="card text-center py-12">
              <div className="spinner mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Učitavanje profila...</p>
            </div>
          ) : selectedUser ? (
            <div className="card">
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Moj Profil
                </h2>
                <span className={`badge ${selectedUser.is_blocked ? 'badge-danger' : 'badge-success'}`}>
                  {selectedUser.is_blocked ? 'Blokiran' : 'Aktivan'}
                </span>
              </div>

              <div className="space-y-6">
                <div className="flex items-center space-x-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                    {selectedUser.username[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedUser.username}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">User ID</label>
                    <p className="text-gray-900 dark:text-white font-semibold text-lg">{selectedUser.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Uloga</label>
                    <p className="text-gray-900 dark:text-white font-semibold text-lg capitalize">{selectedUser.role}</p>
                  </div>
                  {selectedUser.first_name && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Ime</label>
                      <p className="text-gray-900 dark:text-white font-semibold text-lg">{selectedUser.first_name}</p>
                    </div>
                  )}
                  {selectedUser.last_name && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Prezime</label>
                      <p className="text-gray-900 dark:text-white font-semibold text-lg">{selectedUser.last_name}</p>
                    </div>
                  )}
                </div>

                {selectedUser.biography && (
                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Biografija</label>
                    <p className="text-gray-900 dark:text-white mt-2 text-lg">{selectedUser.biography}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card text-center py-12">
              <div className="text-6xl mb-4">👤</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Nema Podataka o Profilu
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Došlo je do greške pri učitavanju profila
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
