import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const features = [
    {
      icon: '🔍',
      title: 'Search Medicines',
      description: 'Find any medicine by name, generic name, or manufacturer'
    },
    {
      icon: '📍',
      title: 'Nearby Pharmacies',
      description: 'Locate pharmacies near you with real-time stock information'
    },
    {
      icon: '⚡',
      title: 'Real-time Availability',
      description: 'Check medicine availability instantly across multiple stores'
    },
    {
      icon: '🔔',
      title: 'Stock Alerts',
      description: 'Get notified when your medicine becomes available'
    },
    {
      icon: '💳',
      title: 'Easy Ordering',
      description: 'Order medicines online and pick up or get delivered'
    },
    {
      icon: '💰',
      title: 'Compare Prices',
      description: 'Find the best prices across different pharmacies'
    }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="hero hero-home">
        <div className="container">
          <h1 className="hero-title">Find Medicines Near You</h1>
          <p className="hero-subtitle">
            Check real-time availability of medicines at nearby pharmacies
          </p>
          
          <form
            onSubmit={handleSearch}
            className="search-box"
            style={{
              marginTop: '2rem',
              maxWidth: 760,
              marginLeft: 'auto',
              marginRight: 'auto',
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <input
              type="text"
              className="form-input"
              placeholder="Search for medicines, brands, or symptoms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: '1.125rem', padding: '1rem', flex: '1 1 320px' }}
            />
            <button type="submit" className="btn btn-secondary btn-lg" style={{ flex: '0 0 auto' }}>
              Search
            </button>
          </form>
          <p style={{ marginTop: '1rem', opacity: 0.8 }}>
            Popular: Paracetamol, Amoxicillin, Vitamin D3, Omeprazole
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: '4rem 1rem' }}>
        <div className="container">
          <h2 className="text-center mb-4">Why Choose MediFind?</h2>
          <div className="grid grid-3" style={{ marginTop: '2rem' }}>
            {features.map((feature, index) => (
              <div key={index} className="card" style={{ textAlign: 'center' }}>
                <div className="card-body">
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{feature.icon}</div>
                  <h4 style={{ marginBottom: '0.5rem' }}>{feature.title}</h4>
                  <p className="text-muted">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: '4rem 1rem', backgroundColor: 'var(--white)' }}>
        <div className="container">
          <h2 className="text-center mb-4">How It Works</h2>
          <div className="grid grid-4" style={{ marginTop: '2rem' }}>
            {[
              { step: '1', title: 'Search', desc: 'Enter the medicine name' },
              { step: '2', title: 'Locate', desc: 'Find nearby pharmacies' },
              { step: '3', title: 'Compare', desc: 'Check prices & availability' },
              { step: '4', title: 'Order', desc: 'Place your order online' }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  margin: '0 auto 1rem'
                }}>
                  {item.step}
                </div>
                <h4>{item.title}</h4>
                <p className="text-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '4rem 1rem',
        background: 'linear-gradient(135deg, var(--secondary) 0%, var(--secondary-dark) 100%)',
        color: 'white',
        textAlign: 'center'
      }}>
        <div className="container">
          <h2 style={{ color: 'white', marginBottom: '1rem' }}>Are you a Pharmacy Owner?</h2>
          <p style={{ opacity: 0.9, marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
            Join MediFind to reach more customers and manage your inventory efficiently
          </p>
          <button 
            onClick={() => navigate('/register?role=pharmacy')} 
            className="btn btn-lg"
            style={{ background: 'white', color: 'var(--secondary)' }}
          >
            Register Your Pharmacy
          </button>
        </div>
      </section>
    </div>
  );
};

export default Home;
