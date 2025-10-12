import { useState } from "react";
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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "turista",
    first_name: "",
    last_name: "",
    biography: ""
  });

  const API_URL = "http://localhost:8001/api/users";

  // Redirect if not authenticated
  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

  const fetchUser = async (userId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/${userId}`);
      const data = await response.json();
      setSelectedUser(data);
    } catch (error) {
      console.error("Error fetching user:", error);
      alert("Greška pri učitavanju korisnika");
    } finally {
      setLoading(false);
    }
  };

  const loadMyProfile = () => {
    if (currentUser?.id) {
      fetchUser(currentUser.id);
    }
  };

  const registerUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        alert("Korisnik uspešno registrovan!");
        setShowRegisterForm(false);
        setFormData({
          username: "",
          email: "",
          password: "",
          role: "turista",
          first_name: "",
          last_name: "",
          biography: ""
        });
      } else {
        const error = await response.json();
        alert(`Greška: ${error.detail}`);
      }
    } catch (error) {
      console.error("Error registering user:", error);
      alert("Greška pri registraciji");
    } finally {
      setLoading(false);
    }
  };

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

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Actions */}
          <div className="space-y-6">
            {/* My Profile Card */}
            <div className="card bg-gradient-to-r from-blue-500 to-purple-500 text-white">
              <h2 className="text-xl font-bold mb-4">Moj Profil</h2>
              <p className="mb-4 text-blue-100">Prikaži podatke tvog naloga</p>
              <button
                onClick={loadMyProfile}
                disabled={loading}
                className="btn w-full bg-white text-blue-600 hover:bg-blue-50"
              >
                Učitaj Moj Profil
              </button>
            </div>

            {/* Get User Card */}
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Pretraga Korisnika
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    User ID
                  </label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Unesite ID korisnika"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        const value = (e.target as HTMLInputElement).value;
                        if (value) fetchUser(parseInt(value));
                      }
                    }}
                  />
                </div>
                <button
                  onClick={() => {
                    const input = document.querySelector('input[type="number"]') as HTMLInputElement;
                    if (input?.value) fetchUser(parseInt(input.value));
                  }}
                  disabled={loading}
                  className="btn btn-primary w-full"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <span className="spinner mr-2"></span>
                      Učitavanje...
                    </span>
                  ) : (
                    "Pretraži Korisnika"
                  )}
                </button>
              </div>
            </div>

            {/* Register User Card */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Registracija Korisnika
                </h2>
                <button
                  onClick={() => setShowRegisterForm(!showRegisterForm)}
                  className="btn btn-secondary text-sm"
                >
                  {showRegisterForm ? "Zatvori" : "Otvori Formu"}
                </button>
              </div>

              {showRegisterForm && (
                <form onSubmit={registerUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      className="input"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      className="input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      className="input"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Uloga *
                    </label>
                    <select
                      className="input"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="turista">Turista</option>
                      <option value="vodic">Vodič</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Ime
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Prezime
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="btn btn-success w-full">
                    {loading ? "Registracija..." : "Registruj Korisnika"}
                  </button>
                </form>
              )}
            </div>

            {/* Info Card */}
            <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-2">API Endpoints</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>• POST /api/users/register</li>
                <li>• GET /api/users/:id</li>
                <li>• PUT /api/users/:id/profile</li>
              </ul>
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {selectedUser ? (
              <div className="card">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Detalji Korisnika
                  </h2>
                  <span className={`badge ${selectedUser.is_blocked ? 'badge-danger' : 'badge-success'}`}>
                    {selectedUser.is_blocked ? 'Blokiran' : 'Aktivan'}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {selectedUser.username[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedUser.username}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">{selectedUser.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">ID</label>
                      <p className="text-gray-900 dark:text-white font-semibold">{selectedUser.id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Uloga</label>
                      <p className="text-gray-900 dark:text-white font-semibold capitalize">{selectedUser.role}</p>
                    </div>
                    {selectedUser.first_name && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Ime</label>
                        <p className="text-gray-900 dark:text-white font-semibold">{selectedUser.first_name}</p>
                      </div>
                    )}
                    {selectedUser.last_name && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Prezime</label>
                        <p className="text-gray-900 dark:text-white font-semibold">{selectedUser.last_name}</p>
                      </div>
                    )}
                  </div>

                  {selectedUser.biography && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Biografija</label>
                      <p className="text-gray-900 dark:text-white mt-1">{selectedUser.biography}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card text-center py-12">
                <div className="text-6xl mb-4">👤</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Nema Odabranog Korisnika
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Pretražite korisnika po ID-u da vidite detalje
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
