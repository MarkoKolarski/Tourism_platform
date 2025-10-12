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

interface AllUser {
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

export default function FollowersPage() {
  const { user, isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<FollowStats | null>(null);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [following, setFollowing] = useState<Follower[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"followers" | "following" | "recommendations" | "all">("followers");
  const [followingInProgress, setFollowingInProgress] = useState<number | null>(null);
  const [displayedUsersCount, setDisplayedUsersCount] = useState(10); // Početni broj prikazanih korisnika

  const API_URL = "http://localhost:8002/api/followers";
  const USERS_API_URL = "http://localhost:8001/api/users";

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

  const fetchAllUsers = async () => {
    try {
      const response = await fetch(`${USERS_API_URL}/all`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();
      // Ensure data is always an array
      setAllUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching all users:", error);
      setAllUsers([]);
    }
  };

  const handleFollow = async (followingUserId: number) => {
    setFollowingInProgress(followingUserId);
    try {
      const response = await fetch(`${API_URL}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          follower_id: user?.id,
          following_id: followingUserId
        })
      });

      if (response.ok) {
        alert("Uspešno zapraćen korisnik!");
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
      setFollowingInProgress(null);
    }
  };

  const handleUnfollow = async (followingUserId: number) => {
    setFollowingInProgress(followingUserId);
    try {
      const response = await fetch(`${API_URL}/unfollow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          follower_id: user?.id,
          following_id: followingUserId
        })
      });

      if (response.ok) {
        alert("Uspešno otpraćen korisnik!");
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
      setFollowingInProgress(null);
    }
  };

  const loadUserData = async (uid: string) => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStats(uid),
        fetchFollowers(uid),
        fetchFollowing(uid),
        fetchRecommendations(uid),
        fetchAllUsers()
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

  // Check if user is already being followed
  const isFollowing = (userId: number) => {
    return following.some(f => f.user_id === userId);
  };

  // Filter out current user and admin users, then get paginated users
  const filteredAllUsers = allUsers.filter(u => u.id !== user?.id && u.role !== 'admin');
  const displayedUsers = filteredAllUsers.slice(0, displayedUsersCount);
  const hasMoreUsers = displayedUsersCount < filteredAllUsers.length;

  const loadMoreUsers = () => {
    setDisplayedUsersCount(prev => Math.min(prev + 10, filteredAllUsers.length));
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
            {/* Left Column - Stats */}
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
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`px-4 py-2 font-medium -mb-px ${
                      activeTab === "all"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    Svi Korisnici ({filteredAllUsers.length})
                  </button>
                </div>

                {/* Tab Content */}
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {activeTab === "followers" && (
                    <>
                      {followers.length > 0 ? (
                        followers.map((follower) => {
                          // Pronađi full user info iz allUsers liste
                          const fullUserInfo = allUsers.find(u => u.id === follower.user_id);
                          
                          return (
                            <div key={follower.user_id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                              <div className="flex items-center space-x-3 flex-1">
                                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                  {follower.username[0].toUpperCase()}
                                </div>
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900 dark:text-white">
                                    {follower.username}
                                  </div>
                                  {fullUserInfo && (
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      {fullUserInfo.first_name && fullUserInfo.last_name 
                                        ? `${fullUserInfo.first_name} ${fullUserInfo.last_name}` 
                                        : fullUserInfo.email}
                                    </div>
                                  )}
                                </div>
                                {fullUserInfo && (
                                  <span className="badge badge-secondary capitalize">{fullUserInfo.role}</span>
                                )}
                              </div>
                              {!isFollowing(follower.user_id) && (
                                <button
                                  onClick={() => handleFollow(follower.user_id)}
                                  disabled={followingInProgress === follower.user_id}
                                  className="btn btn-primary btn-sm ml-4"
                                >
                                  {followingInProgress === follower.user_id ? "..." : "Zaprati"}
                                </button>
                              )}
                            </div>
                          );
                        })
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
                        following.map((user) => {
                          // Pronađi full user info iz allUsers liste
                          const fullUserInfo = allUsers.find(u => u.id === user.user_id);
                          
                          return (
                            <div key={user.user_id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                              <div className="flex items-center space-x-3 flex-1">
                                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                  {user.username[0].toUpperCase()}
                                </div>
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900 dark:text-white">
                                    {user.username}
                                  </div>
                                  {fullUserInfo && (
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      {fullUserInfo.first_name && fullUserInfo.last_name 
                                        ? `${fullUserInfo.first_name} ${fullUserInfo.last_name}` 
                                        : fullUserInfo.email}
                                    </div>
                                  )}
                                </div>
                                {fullUserInfo && (
                                  <span className="badge badge-secondary capitalize">{fullUserInfo.role}</span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  className="btn btn-primary btn-sm"
                                  title="Pogledaj blog korisnika (dostupno uskoro)"
                                >
                                  📝 Blog
                                </button>
                                <button
                                  onClick={() => handleUnfollow(user.user_id)}
                                  disabled={followingInProgress === user.user_id}
                                  className="btn btn-danger btn-sm"
                                >
                                  {followingInProgress === user.user_id ? "..." : "Otprati"}
                                </button>
                              </div>
                            </div>
                          );
                        })
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
                          {recommendations.map((rec) => {
                            // Pronađi full user info iz allUsers liste
                            const fullUserInfo = allUsers.find(u => u.id === rec.user_id);
                            
                            return (
                              <div key={rec.user_id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                <div className="flex items-center space-x-3 flex-1">
                                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                    {rec.username[0].toUpperCase()}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-semibold text-gray-900 dark:text-white">{rec.username}</div>
                                    {fullUserInfo && (
                                      <div className="text-sm text-gray-600 dark:text-gray-400">
                                        {fullUserInfo.first_name && fullUserInfo.last_name 
                                          ? `${fullUserInfo.first_name} ${fullUserInfo.last_name}` 
                                          : fullUserInfo.email}
                                      </div>
                                    )}
                                    <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                      {rec.mutual_friends} {rec.mutual_friends === 1 ? 'zajednički prijatelj' : 'zajedničkih prijatelja'}
                                    </div>
                                  </div>
                                  {fullUserInfo && (
                                    <span className="badge badge-secondary capitalize">{fullUserInfo.role}</span>
                                  )}
                                </div>
                                {!isFollowing(rec.user_id) && (
                                  <button
                                    onClick={() => handleFollow(rec.user_id)}
                                    disabled={followingInProgress === rec.user_id}
                                    className="btn btn-success btn-sm ml-4"
                                  >
                                    {followingInProgress === rec.user_id ? "..." : "Zaprati"}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </>
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          Nema preporuka za sada
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === "all" && (
                    <>
                      <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <p className="text-sm text-orange-800 dark:text-orange-300">
                          👥 Svi korisnici u sistemu - možete zapratiti korisnike koje još ne pratite
                        </p>
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                          Prikazano {displayedUsers.length} od {filteredAllUsers.length} korisnika
                        </p>
                      </div>
                      {displayedUsers.length > 0 ? (
                        <>
                          {displayedUsers.map((usr) => (
                            <div key={usr.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                              <div className="flex items-center space-x-3 flex-1">
                                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                  {usr.username[0].toUpperCase()}
                                </div>
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900 dark:text-white">{usr.username}</div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {usr.first_name && usr.last_name ? `${usr.first_name} ${usr.last_name}` : usr.email}
                                  </div>
                                </div>
                                <span className="badge badge-secondary capitalize">{usr.role}</span>
                              </div>
                              {!isFollowing(usr.id) ? (
                                <button
                                  onClick={() => handleFollow(usr.id)}
                                  disabled={followingInProgress === usr.id}
                                  className="btn btn-success btn-sm ml-4"
                                >
                                  {followingInProgress === usr.id ? "..." : "Zaprati"}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUnfollow(usr.id)}
                                  disabled={followingInProgress === usr.id}
                                  className="btn btn-danger btn-sm ml-4"
                                >
                                  {followingInProgress === usr.id ? "..." : "Otprati"}
                                </button>
                              )}
                            </div>
                          ))}
                          {hasMoreUsers && (
                            <div className="pt-4 text-center">
                              <button
                                onClick={loadMoreUsers}
                                className="btn btn-primary"
                              >
                                Učitaj još ({filteredAllUsers.length - displayedUsersCount} preostalo)
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          Nema drugih korisnika
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
