import { useState } from "react";
import Layout from "../components/Layout";

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
  const [userId, setUserId] = useState("");
  const [stats, setStats] = useState<FollowStats | null>(null);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [following, setFollowing] = useState<Follower[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"stats" | "followers" | "following" | "recommendations">("stats");

  // Follow/Unfollow state
  const [followerId, setFollowerId] = useState("");
  const [followingId, setFollowingId] = useState("");

  const API_URL = "http://localhost:8002/api/followers";

  const fetchStats = async (uid: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/stats/${uid}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
      alert("Greška pri učitavanju statistike");
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowers = async (uid: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/followers/${uid}`);
      const data = await response.json();
      setFollowers(data);
    } catch (error) {
      console.error("Error fetching followers:", error);
      alert("Greška pri učitavanju pratilaca");
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowing = async (uid: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/following/${uid}`);
      const data = await response.json();
      setFollowing(data);
    } catch (error) {
      console.error("Error fetching following:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async (uid: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/recommendations/${uid}?limit=10`);
      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!followerId || !followingId) {
      alert("Unesite oba ID-a");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          follower_id: parseInt(followerId),
          following_id: parseInt(followingId)
        })
      });

      if (response.ok) {
        alert("Uspešno zapraćen korisnik!");
        setFollowerId("");
        setFollowingId("");
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
    if (!followerId || !followingId) {
      alert("Unesite oba ID-a");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/unfollow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          follower_id: parseInt(followerId),
          following_id: parseInt(followingId)
        })
      });

      if (response.ok) {
        alert("Uspešno otpraćen korisnik!");
        setFollowerId("");
        setFollowingId("");
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

  const loadUserData = (uid: string) => {
    setUserId(uid);
    fetchStats(uid);
    fetchFollowers(uid);
    fetchFollowing(uid);
    fetchRecommendations(uid);
  };

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
                Graf relacija praćenja između korisnika
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="badge badge-success">Port 8002</div>
              <div className="badge badge-primary">Neo4j</div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* User Search */}
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Pretraga Korisnika
              </h2>
              <div className="space-y-4">
                <input
                  type="number"
                  className="input"
                  placeholder="User ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && userId && loadUserData(userId)}
                />
                <button
                  onClick={() => userId && loadUserData(userId)}
                  disabled={loading || !userId}
                  className="btn btn-primary w-full"
                >
                  {loading ? "Učitavanje..." : "Učitaj Podatke"}
                </button>
              </div>
            </div>

            {/* Follow/Unfollow Actions */}
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Follow Akcije
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Follower ID
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={followerId}
                    onChange={(e) => setFollowerId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Following ID
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={followingId}
                    onChange={(e) => setFollowingId(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleFollow} className="btn btn-success">
                    Follow
                  </button>
                  <button onClick={handleUnfollow} className="btn btn-danger">
                    Unfollow
                  </button>
                </div>
              </div>
            </div>

            {/* API Info */}
            <div className="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <h3 className="font-bold text-green-900 dark:text-green-200 mb-2">API Endpoints</h3>
              <ul className="text-sm text-green-800 dark:text-green-300 space-y-1">
                <li>• POST /follow</li>
                <li>• POST /unfollow</li>
                <li>• GET /followers/:id</li>
                <li>• GET /following/:id</li>
                <li>• GET /stats/:id</li>
                <li>• GET /recommendations/:id</li>
              </ul>
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Card */}
            {stats && (
              <div className="card">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Statistika Korisnika #{stats.user_id}
                </h2>
                <div className="grid grid-cols-2 gap-6">
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
                    <div className="text-gray-600 dark:text-gray-400">Prati</div>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            {(followers.length > 0 || following.length > 0 || recommendations.length > 0) && (
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
                    Prati ({following.length})
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
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {activeTab === "followers" && followers.map((follower) => (
                    <div key={follower.user_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                          {follower.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{follower.username}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">ID: {follower.user_id}</div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {activeTab === "following" && following.map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                          {user.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{user.username}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">ID: {user.user_id}</div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {activeTab === "recommendations" && recommendations.map((rec) => (
                    <div key={rec.user_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {rec.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{rec.username}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {rec.mutual_friends} zajedničkih prijatelja
                          </div>
                        </div>
                      </div>
                      <span className="badge badge-primary">{rec.mutual_friends}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!stats && (
              <div className="card text-center py-12">
                <div className="text-6xl mb-4">🔗</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Nema Učitanih Podataka
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Unesite User ID i učitajte podatke o praćenju
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
