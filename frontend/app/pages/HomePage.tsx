import { Link } from "react-router";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  const services = [
    {
      name: "Stakeholders Service",
      description: "Upravljanje korisnicima, autentifikacija i profili",
      icon: "👥",
      color: "bg-blue-500",
      link: "/users",
      features: [
        "Registracija i prijava",
        "JWT autentifikacija",
        "Upravljanje profilima",
        "Role-based access"
      ]
    },
    {
      name: "Blogs Service",
      description: "Putni blogovi, komentari i interakcije",
      icon: "📖",
      color: "bg-orange-500",
      link: "/blogs",
      features: [
        "Kreiranje blog postova",
        "Komentari i odgovori",
        "Like sistem",
        "Pretraga sadržaja"
      ]
    },
    {
      name: "Followers Service",
      description: "Graf relacija, praćenje korisnika i preporuke",
      icon: "🔗",
      color: "bg-green-500",
      link: "/followers",
      features: [
        "Follow/Unfollow korisnika",
        "Preporuke za praćenje",
        "Uzajamni pratioci",
        "Statistika praćenja"
      ]
    },
    {
      name: "Tours Service",
      description: "Kreiranje, upravljanje i pregled turističkih tura",
      icon: "🗺️",
      color: "bg-yellow-500",
      link: "/tours",
      features: [
        "Kreiranje tura (draft/published/archived)",
        "Mapa i ključne tačke",
        "Recenzije i ocene",
        "Različita vremena obilaska"
      ]
    },
    {
      name: "Purchases Service",
      description: "Kupovina tura, SAGA pattern i transakcije",
      icon: "🛒",
      color: "bg-purple-500",
      link: "/purchase",
      features: [
        "Shopping korpa",
        "Checkout proces",
        "SAGA orchestration",
        "Purchase tokeni"
      ]
    },

  ];

  return (
    <Layout>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4">Tourism Platform</h1>
            <p className="text-xl mb-8 text-blue-100">Mikroservisna arhitektura za turističku platformu</p>
            
            {isAuthenticated ? (
              <div className="bg-white/20 backdrop-blur-sm px-8 py-4 rounded-lg inline-block">
                <p className="text-lg">Dobrodošli, <span className="font-bold">{user?.username}</span>! 👋</p>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl"
              >
                Prijavite se da nastavite 🚀
              </Link>
            )}
            
            <div className="flex justify-center gap-4 flex-wrap mt-8">
              <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-lg">
                <div className="text-2xl font-bold">5</div>
                <div className="text-sm">Mikroservisa</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-lg">
                <div className="text-2xl font-bold">SAGA</div>
                <div className="text-sm">Pattern</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-lg">
                <div className="text-2xl font-bold">REST</div>
                <div className="text-sm">API</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
          Naši Servisi
        </h2>
        
        {!isAuthenticated && (
          <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
            <p className="text-blue-800 dark:text-blue-200">
              💡 <Link to="/login" className="font-semibold underline">Prijavite se</Link> da pristupite svim servisima platforme!
            </p>
          </div>
        )}
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service) => (
            isAuthenticated ? (
              <Link 
                key={service.name}
                to={service.link}
                className="card card-hover group"
              >
                <div className="text-center mb-4">
                  <div className={`inline-flex items-center justify-center w-16 h-16 ${service.color} text-white text-3xl rounded-full mb-4 group-hover:scale-110 transition-transform`}>
                    {service.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {service.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                    {service.description}
                  </p>
                </div>
                
                <div className="space-y-2">
                  {service.features.map((feature) => (
                    <div key={feature} className="flex items-start text-xs text-gray-700 dark:text-gray-300">
                      <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </Link>
            ) : (
              <div 
                key={service.name}
                className="card opacity-60 cursor-not-allowed"
              >
                <div className="text-center mb-4">
                  <div className={`inline-flex items-center justify-center w-16 h-16 ${service.color} text-white text-3xl rounded-full mb-4`}>
                    {service.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {service.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                    {service.description}
                  </p>
                </div>
                
                <div className="space-y-2">
                  {service.features.map((feature) => (
                    <div key={feature} className="flex items-start text-xs text-gray-700 dark:text-gray-300">
                      <svg className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 text-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">🔒 Potrebna prijava</span>
                </div>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Architecture Overview */}
      <div className="bg-gray-100 dark:bg-gray-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Arhitektura Sistema
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="text-2xl mr-2">🗄️</span>
                Baze Podataka
              </h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  PostgreSQL - Stakeholders & Purchase
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Neo4j - Followers (Graph DB)
                </li>
              </ul>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="text-2xl mr-2">⚙️</span>
                Key Features
              </h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  SAGA Pattern za distribuirane transakcije
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                  JWT autentifikacija
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                  RESTful API komunikacija
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">8001</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Stakeholders Port</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">8002</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Followers Port</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-600 mb-2">8003</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Purchases Port</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-orange-600 mb-2">8004</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Blogs Port</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-yellow-600 mb-2">8005</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Tours Port</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-indigo-600 mb-2">100%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Microservices</div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
