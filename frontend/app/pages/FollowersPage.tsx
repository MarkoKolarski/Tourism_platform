import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";

interface FollowStats {
  user_id: number;
  followers_count: number;
  following_count: number;
}

interface Follower {
  user_id: number;
  username: string;
}

interface Recommendation {
  user_id: number;
  username: string;
  mutual_friends: number;
}

export default function FollowersPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<FollowStats | null>(null);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [following, setFollowing] = useState<Follower[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"followers" | "following" | "recommendations">("followers");

  // Follow/Unfollow state
  const [followingId, setFollowingId] = useState("");

  const API_URL = "http://localhost:8002/api/followers";

  // Redirect if not authenticated
  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

  const fetchStats = async (uid: string) => {
    try {
      const response = await fetch(`${API_URL}/stats/${uid}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchFollowers = async (uid: string) => {
    try {
      const response = await fetch(`${API_URL}/followers/${uid}`);
      const data = await response.json();
      setFollowers(data);
    } catch (error) {
      console.error("Error fetching followers:", error);
    }
  };

  const fetchFollowing = async (uid: string) => {
    try {
      const response = await fetch(`${API_URL}/following/${uid}`);
      const data = await response.json();
      setFollowing(data);
    } catch (error) {
      console.error("Error fetching following:", error);
    }
  };

  const fetchRecommendations = async (uid: string) => {
    try {
      const response = await fetch(`${API_URL}/recommendations/${uid}?limit=10`);
      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    }
  };

  const handleFollow = async () => {
    if (!followingId) {
      alert("Unesite ID korisnika za praćenje");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          follower_id: user?.id,
          following_id: parseInt(followingId)
        })
      });

      if (response.ok) {
        alert("Uspešno zapraćen korisnik!");
        setFollowingId("");
        // Refresh data
        if (user?.id) {
          await loadUserData(user.id.toString());
        }
      } else {
        const error = await response.json();
        alert(`Greška: ${error.detail}`);
      }
    } catch (error) {
      console.error("Error following user:", error);
      alert("Greška pri praćenju");
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!followingId) {
      alert("Unesite ID korisnika");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/unfollow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          follower_id: user?.id,
          following_id: parseInt(followingId)
        })
      });

      if (response.ok) {
        alert("Uspešno otpraćen korisnik!");
        setFollowingId("");
        // Refresh data
        if (user?.id) {
          await loadUserData(user.id.toString());
        }
      } else {
        const error = await response.json();
        alert(`Greška: ${error.detail}`);
      }
    } catch (error) {
      console.error("Error unfollowing user:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async (uid: string) => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStats(uid),
        fetchFollowers(uid),
        fetchFollowing(uid),
        fetchRecommendations(uid)
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Load current user's data on mount
  useEffect(() => {
    if (user?.id) {
      loadUserData(user.id.toString());
    }
  }, [user?.id]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                🔗 Followers Service
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Graf relacija praćenja - Ulogovani kao <span className="font-semibold text-blue-600">{user?.username}</span>
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="badge badge-success">Port 8002</div>
              <div className="badge badge-primary">Neo4j</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="card text-center py-12">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Učitavanje podataka...</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Stats & Actions */}
            <div className="lg:col-span-1 space-y-6">
              {/* Stats Card */}
              {stats && (
                <div className="card">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Moja Statistika
                  </h2>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="text-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-4xl font-bold text-blue-600 mb-2">
                        {stats.followers_count}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">Pratilaca</div>
                    </div>
                    <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-4xl font-bold text-green-600 mb-2">
                        {stats.following_count}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">Pratim</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Follow/Unfollow Actions */}
              <div className="card">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Zaprati Korisnika
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      User ID
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={followingId}
                      onChange={(e) => setFollowingId(e.target.value)}
                      placeholder="Unesite User ID"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={handleFollow} 
                      className="btn btn-success"
                      disabled={!followingId}
                    >
                      Zaprati
                    </button>
                    <button 
                      onClick={handleUnfollow} 
                      className="btn btn-danger"
                      disabled={!followingId}
                    >
                      Otprati
                    </button>
                  </div>
                </div>
              </div>

              {/* Info Card */}
              <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-2">Funkcionalnosti</h3>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <li>• Zaprati druge korisnike</li>
                  <li>• Vidi ko te prati</li>
                  <li>• Preporuke za praćenje</li>
                  <li>• Zajedničke veze</li>
                </ul>
              </div>
            </div>

            {/* Right Column - Lists */}
            <div className="lg:col-span-2">
              <div className="card">
                {/* Tab Headers */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                  <button
                    onClick={() => setActiveTab("followers")}
                    className={`px-4 py-2 font-medium -mb-px ${
                      activeTab === "followers"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    Pratioci ({followers.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("following")}
                    className={`px-4 py-2 font-medium -mb-px ${
                      activeTab === "following"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    Pratim ({following.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("recommendations")}
                    className={`px-4 py-2 font-medium -mb-px ${
                      activeTab === "recommendations"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    Preporuke ({recommendations.length})
                  </button>
                </div>

                {/* Tab Content */}
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {activeTab === "followers" && (
                    <>
                      {followers.length > 0 ? (
                        followers.map((follower) => (
                          <div key={follower.user_id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                {follower.username[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-white">{follower.username}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">ID: {follower.user_id}</div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          Nemate pratioce
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === "following" && (
                    <>
                      {following.length > 0 ? (
                        following.map((user) => (
                          <div key={user.user_id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                {user.username[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-white">{user.username}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">ID: {user.user_id}</div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          Ne pratite nikoga
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === "recommendations" && (
                    <>
                      {recommendations.length > 0 ? (
                        <>
                          <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <p className="text-sm text-purple-800 dark:text-purple-300">
                              💡 Preporuke su zasnovane na zajedničkim vezama - korisnici koje prate ljudi koje vi pratite
                            </p>
                          </div>
                          {recommendations.map((rec) => (
                            <div key={rec.user_id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                              <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                  {rec.username[0].toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900 dark:text-white">{rec.username}</div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {rec.mutual_friends} {rec.mutual_friends === 1 ? 'zajednički prijatelj' : 'zajedničkih prijatelja'}
                                  </div>
                                </div>
                              </div>
                              <span className="badge badge-primary">{rec.mutual_friends}</span>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          Nema preporuka za sada
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
