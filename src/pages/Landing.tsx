import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Sparkles, MessageSquare, Wallet, Navigation, Globe, Leaf } from 'lucide-react';

export const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* NAVBAR */}
      <header className="h-20 border-b border-border bg-card/65 backdrop-blur-md sticky top-0 z-50 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-xl">
            Ω
          </span>
          <span className="font-bold text-xl tracking-tight">
            Carpool<span className="text-primary">Org</span>
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <Link to="/login" className="text-sm font-medium hover:text-primary transition-colors px-3 py-2 rounded-lg">
            Sign In
          </Link>
          <Link to="/register" className="text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-4 py-2 rounded-lg shadow-md shadow-primary/20">
            Get Started
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-20 pb-16 px-6 sm:px-12 lg:px-24 flex flex-col items-center text-center max-w-7xl mx-auto w-full">
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse-slow"></div>

        <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary border border-primary/20 rounded-full px-4 py-1.5 text-xs font-semibold mb-6">
          <Sparkles size={14} />
          <span>The Next Gen Enterprise Commute Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl font-sans leading-tight">
          Commute Together. <br />
          <span className="bg-gradient-to-r from-primary via-purple-500 to-indigo-500 bg-clip-text text-transparent">
            Reduce Carbon Footprint.
          </span>
        </h1>

        <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mt-6 leading-relaxed">
          The secure carpooling platform. Save commute costs, share routes safely, and help build a greener future.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mt-10">
          <Link to="/register" className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold shadow-lg shadow-primary/25 transition-all hover:scale-[1.02]">
            Start Pooling Now
          </Link>
          <a href="#how-it-works" className="w-full sm:w-auto px-8 py-4 bg-card border border-border hover:bg-muted/50 rounded-xl font-semibold transition-all">
            See How It Works
          </a>
        </div>

        {/* Ticker / Statistics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-5xl mt-24 border border-border bg-card/40 backdrop-blur-sm rounded-2xl p-6 sm:p-8">
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold text-primary">12,500+</p>
            <p className="text-xs text-muted-foreground mt-1 uppercase font-semibold tracking-wider">Trips Completed</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold text-primary">85.4 Tons</p>
            <p className="text-xs text-muted-foreground mt-1 uppercase font-semibold tracking-wider">CO₂ Offset</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold text-primary">₹48,000+</p>
            <p className="text-xs text-muted-foreground mt-1 uppercase font-semibold tracking-wider">Commute Fuel Saved</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold text-primary">99.9%</p>
            <p className="text-xs text-muted-foreground mt-1 uppercase font-semibold tracking-wider">Verified Users</p>
          </div>
        </div>
      </section>

      {/* CORE FEATURES */}
      <section className="py-20 bg-muted/30 border-y border-border px-6 sm:px-12 lg:px-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight">Enterprise Grade Architecture</h2>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              Designed from scratch to fit corporate security compliance standards while delivering a seamless, high-performance user experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card border border-border p-8 rounded-2xl hover-glow">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                <Shield size={24} />
              </div>
              <h3 className="font-bold text-lg">Secure User Verification</h3>
              <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
                Automatic user verification checks. Only approved accounts can match, offer, or accept bookings.
              </p>
            </div>

            <div className="bg-card border border-border p-8 rounded-2xl hover-glow">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                <Navigation size={24} />
              </div>
              <h3 className="font-bold text-lg">Live Map Tracking</h3>
              <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
                Powered by OpenStreetMap. Connect passengers and drivers in real time with exact pickup spots, ETA timers, and routes.
              </p>
            </div>

            <div className="bg-card border border-border p-8 rounded-2xl hover-glow">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                <MessageSquare size={24} />
              </div>
              <h3 className="font-bold text-lg">Realtime Communication</h3>
              <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
                Connect instantly with WebSocket chat consumers. Typing indicators, read receipts, and online status checks keep routes synchronized.
              </p>
            </div>

            <div className="bg-card border border-border p-8 rounded-2xl hover-glow">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                <Wallet size={24} />
              </div>
              <h3 className="font-bold text-lg">Integrated Digital Wallet</h3>
              <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
                Automatic billing upon booking approval. Locked fare transfers secure driver earnings, completed instantly when the trip terminates.
              </p>
            </div>

            <div className="bg-card border border-border p-8 rounded-2xl hover-glow">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                <Leaf size={24} />
              </div>
              <h3 className="font-bold text-lg">Carbon Offset Metrics</h3>
              <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
                Custom carbon footprint calculators. Visual widgets, distance logs, and leaderboards display the organization's ecological impacts.
              </p>
            </div>

            <div className="bg-card border border-border p-8 rounded-2xl hover-glow">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                <Globe size={24} />
              </div>
              <h3 className="font-bold text-lg">Test Payment Gateway</h3>
              <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
                Ready to recharge and run payments in mock mode. Simulated Razorpay payloads allow full wallet deposits and ride bookings verification.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20 px-6 sm:px-12 lg:px-24 max-w-6xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
          <p className="text-muted-foreground mt-4">Simplicity at core. Register, offer/find, and commute safely in minutes.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          <div className="flex flex-col items-center text-center">
            <span className="h-12 w-12 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-lg mb-4">
              1
            </span>
            <h4 className="font-bold text-base">Register an Account</h4>
            <p className="text-muted-foreground text-xs mt-2 leading-relaxed">
              Signup and create an account. Fill in your details to get registered under our carpooling platform.
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <span className="h-12 w-12 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-lg mb-4">
              2
            </span>
            <h4 className="font-bold text-base">Offer or Search Rides</h4>
            <p className="text-muted-foreground text-xs mt-2 leading-relaxed">
              Drivers set routes, vehicle details, dates, and fare prices. Commuters look up matching routes and book seats.
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <span className="h-12 w-12 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-lg mb-4">
              3
            </span>
            <h4 className="font-bold text-base">Approve & Pay via Wallet</h4>
            <p className="text-muted-foreground text-xs mt-2 leading-relaxed">
              Drivers approve bookings. Fares lock automatically from passenger wallets to secure the arrangement.
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <span className="h-12 w-12 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-lg mb-4">
              4
            </span>
            <h4 className="font-bold text-base">Track and Ride</h4>
            <p className="text-muted-foreground text-xs mt-2 leading-relaxed">
              Open the live map. Watch driver markers approach, chat in real-time, and complete the ride to release payments.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-border bg-card py-12 px-6 sm:px-12 text-center text-muted-foreground text-xs">
        <p>© 2026 CarpoolOrg Inc. Built for Environmental Responsibility and Commuter Comfort.</p>
        <p className="mt-2 text-muted-foreground/60">Vite • React • Django REST Framework • WebSockets • OpenStreetMap</p>
      </footer>
    </div>
  );
};
