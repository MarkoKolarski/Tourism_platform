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
  profile_image?: string;
  biography?: string;
  motto?: string;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  profile_image?: string;
  biography?: string;
  motto?: string;
}

export default function UsersPage() {
  const { user: currentUser, isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileUpdateData>({});

  const API_URL = "/api/stakeholders-service/users";

  // Redirect if not authenticated
  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

  // Load current user's profile on mount
  useEffect(() => {
    const fetchMyProfile = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/me?user_id=${currentUser?.id}`);
        const data = await response.json();
        setSelectedUser(data);
        setFormData({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          profile_image: data.profile_image || "",
          biography: data.biography || "",
          motto: data.motto || ""
        });
      } catch (error) {
        console.error("Error fetching user:", error);
        alert("Greška pri učitavanju profila");
      } finally {
        setLoading(false);
      }
    };

    fetchMyProfile();
  }, [currentUser?.id]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/profile?user_id=${currentUser?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || "Profil uspešno ažuriran!");
        setIsEditing(false);
        
        // Reload profile
        const profileResponse = await fetch(`${API_URL}/me?user_id=${currentUser?.id}`);
        const updatedProfile = await profileResponse.json();
        setSelectedUser(updatedProfile);
      } else {
        const error = await response.json();
        alert(`Greška: ${error.detail}`);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Greška pri ažuriranju profila");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Moj Profil
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Upravljanje korisnicima - Ulogovani kao <span className="font-semibold text-blue-600">{currentUser?.username}</span>
              </p>
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
                <div className="flex items-center space-x-3">
                  <span className={`badge ${selectedUser.is_blocked ? 'badge-danger' : 'badge-success'}`}>
                    {selectedUser.is_blocked ? 'Blokiran' : 'Aktivan'}
                  </span>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn btn-primary"
                    >
                      ✏️ Izmeni Profil
                    </button>
                  )}
                </div>
              </div>

              {!isEditing ? (
                // View Mode
                <div className="space-y-6">
                  <div className="flex items-center space-x-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                      {selectedUser.username?.[0]?.toUpperCase() || '?'}
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
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Uloga</label>
                      <p className="text-gray-900 dark:text-white font-semibold text-lg capitalize">{selectedUser.role}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Kreiran</label>
                      <p className="text-gray-900 dark:text-white font-semibold text-lg">
                        {new Date(selectedUser.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Ime</label>
                      <p className="text-gray-900 dark:text-white font-semibold text-lg">
                        {selectedUser.first_name || "Nije postavljeno"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Prezime</label>
                      <p className="text-gray-900 dark:text-white font-semibold text-lg">
                        {selectedUser.last_name || "Nije postavljeno"}
                      </p>
                    </div>
                  </div>

                  {selectedUser.motto && (
                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Moto</label>
                      <p className="text-gray-900 dark:text-white mt-2 text-lg italic">"{selectedUser.motto}"</p>
                    </div>
                  )}

                  {selectedUser.biography && (
                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Biografija</label>
                      <p className="text-gray-900 dark:text-white mt-2 text-lg">{selectedUser.biography}</p>
                    </div>
                  )}

                  {selectedUser.profile_image && (
                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Profilna Slika URL</label>
                      <p className="text-gray-900 dark:text-white mt-2 break-all">{selectedUser.profile_image}</p>
                    </div>
                  )}

                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                    Poslednja izmena: {new Date(selectedUser.updated_at).toLocaleString()}
                  </div>
                </div>
              ) : (
                // Edit Mode
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Ime
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name || ""}
                        onChange={handleChange}
                        className="input"
                        placeholder="Unesite ime"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Prezime
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name || ""}
                        onChange={handleChange}
                        className="input"
                        placeholder="Unesite prezime"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Profilna Slika (URL)
                    </label>
                    <input
                      type="text"
                      name="profile_image"
                      value={formData.profile_image || ""}
                      onChange={handleChange}
                      className="input"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Moto (max 255 karaktera)
                    </label>
                    <input
                      type="text"
                      name="motto"
                      value={formData.motto || ""}
                      onChange={handleChange}
                      className="input"
                      placeholder="Vaš lični moto..."
                      maxLength={255}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Biografija (max 1000 karaktera)
                    </label>
                    <textarea
                      name="biography"
                      value={formData.biography || ""}
                      onChange={handleChange}
                      className="input min-h-[120px]"
                      placeholder="Napišite nešto o sebi..."
                      maxLength={1000}
                    ></textarea>
                  </div>

                  <div className="flex space-x-4 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-success flex-1"
                    >
                      {loading ? "Čuvanje..." : "Sačuvaj Izmene"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="btn btn-secondary flex-1"
                    >
                      Otkaži
                    </button>
                  </div>
                </form>
              )}
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
