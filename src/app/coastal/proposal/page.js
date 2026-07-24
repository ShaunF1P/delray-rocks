"use client";
import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, Shield, ShieldCheck, Heart, Layout, CheckCircle, ExternalLink, Calendar, MapPin, Trophy, Package, Users, Church, MessageCircle } from 'lucide-react';

export default function CoastalProposalPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const elements = document.querySelectorAll('.fade-section');
    elements.forEach((el) => observer.observe(el));

    return () => elements.forEach((el) => observer.unobserve(el));
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
  };

  const textGradient = {
    background: 'linear-gradient(135deg, #22C55E, #4ADE80)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };

  return (
    <div className="proposal-container" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0A0F0A 0%, #111C14 50%, #0A0F0A 100%)',
      color: '#F8FAFC',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Orbs */}
      <div className="bg-orb" style={{ top: '-10%', left: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(21,128,61,0.2) 0%, transparent 70%)', animationDelay: '0s' }}></div>
      <div className="bg-orb" style={{ top: '40%', right: '-5%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)', animationDelay: '2s' }}></div>
      <div className="bg-orb" style={{ bottom: '-10%', left: '20%', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(74,222,128,0.1) 0%, transparent 70%)', animationDelay: '4s' }}></div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem', position: 'relative', zIndex: 10 }}>
        
        {/* Header */}
        <header className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94A3B8', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}>
            <ArrowLeft size={18} />
            Back to Landing Page
          </Link>
          <button onClick={handlePrint} style={{ ...glassStyle, padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#F8FAFC', cursor: 'pointer', transition: 'all 0.3s' }} className="hover-glow">
            <Printer size={18} />
            Print
          </button>
        </header>

        {/* Hero Section */}
        <section className="fade-section" style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="glass-card" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', padding: '1rem', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="https://media.hometeamsonline.com/photos/football/DELRAYROCKS/homelogo.jpg" alt="Delray Rocks" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ color: '#94A3B8', fontSize: '2rem', fontWeight: 300 }}>+</div>
            <div className="glass-card" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', padding: '1rem', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="https://coastalcommunity.tv/wp-content/uploads/2025/09/cropped-Untitled-design-8-4-192x192.png" alt="Coastal Community" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
          </div>
          
          <div style={{ display: 'inline-block', padding: '0.25rem 1rem', borderRadius: '9999px', background: 'rgba(21,128,61,0.15)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ADE80', fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            Sponsorship Request
          </div>
          
          <div style={{ ...glassStyle, padding: '2rem', background: 'rgba(255,255,255,0.02)' }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.2, color: '#FFF' }}>Community Partnership Proposal</h1>
            <p style={{ fontSize: '1.25rem', color: '#CBD5E1', maxWidth: '600px', margin: '0 auto' }}>Delray Beach Rocks Youth Sports pitching to Coastal Community Church to support the 8U youth football division.</p>
          </div>
        </section>

        {/* Summary Grid */}
        <section className="fade-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
          <div style={{ ...glassStyle, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }} className="hover-glow glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94A3B8' }}>
              <Church size={20} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Proposed Sponsor</span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFF' }}>Coastal Community Church</div>
          </div>
          <div style={{ ...glassStyle, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }} className="hover-glow glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94A3B8' }}>
              <Trophy size={20} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Package</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, ...textGradient }}>$1,000</div>
          </div>
          <div style={{ ...glassStyle, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }} className="hover-glow glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94A3B8' }}>
              <Package size={20} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Impact</span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFF' }}>Uniform Sets & Player Bags</div>
          </div>
        </section>

        {/* About the Rocks */}
        <section className="fade-section" style={{ ...glassStyle, padding: '2.5rem', marginBottom: '4rem' }}>
          <h2 className="proposal-title-h2" style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '1.5rem', position: 'relative', paddingBottom: '0.75rem', color: '#FFF' }}>About the Delray Beach Rocks</h2>
          <p style={{ color: '#E2E8F0', lineHeight: 1.7, fontSize: '1.125rem', marginBottom: '1.5rem' }}>
            The Delray Beach Rocks organization is a cornerstone of youth athletic development and community mentoring in our local area. We believe that football teaches children far more than just athletic skills; it instills lifelong values of hard work, discipline, sportsmanship, and teamwork.
          </p>
          <p style={{ color: '#E2E8F0', lineHeight: 1.7, fontSize: '1.125rem' }}>
            For the upcoming season, the Delray Rocks 8U division is seeking a supportive community partner to sponsor our young athletes. As a community-first organization, we keep enrollment fees minimal so that every local child has a chance to play, regardless of financial background. To cover our uniform and equipment expenses, we rely on partnerships with organizations that share our dedication to youth development.
          </p>
        </section>

        {/* Why Partner */}
        <section className="fade-section" style={{ marginBottom: '4rem' }}>
          <h2 className="proposal-title-h2" style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '1.5rem', position: 'relative', paddingBottom: '0.75rem', color: '#FFF' }}>Why Partner with the Rocks?</h2>
          <p style={{ color: '#E2E8F0', lineHeight: 1.7, fontSize: '1.125rem', marginBottom: '1.5rem' }}>
            A partnership with the Delray Rocks is a direct, highly visible investment in local families. By supporting this division, Coastal Community Church will establish a regular connection with our player parents, coaches, and volunteers.
          </p>
          <div style={{ ...glassStyle, padding: '2rem', borderLeft: '4px solid #15803D' }} className="hover-glow glass-card">
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <ShieldCheck size={32} color="#22C55E" style={{ flexShrink: 0, marginTop: '0.25rem', filter: 'drop-shadow(0 0 8px rgba(34,197,94,0.5))' }} />
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#FFF' }}>A Structured Bridge to Local Families</h3>
                <p style={{ color: '#E2E8F0', lineHeight: 1.6 }}>
                  Rather than a passive contribution, we have built a structured family outreach campaign. We are actively directing all of our 8U families to visit Coastal Community Church services and events (such as the West Boca Campus Block Party). It is a double-win: the kids get their complete player uniforms and gear bags fully funded, and the church gains an organic, warm connection with local families.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Package Section */}
        <section className="fade-section" style={{ marginBottom: '4rem' }}>
          <h2 className="proposal-title-h2" style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '2rem', position: 'relative', paddingBottom: '0.75rem', color: '#FFF' }}>What the $1,000 Sponsorship Package Funds</h2>
          <p style={{ color: '#E2E8F0', lineHeight: 1.7, fontSize: '1.125rem', marginBottom: '2rem' }}>
            The $1,000 sponsorship from Coastal Community Church directly pays for the complete player gear package for every athlete on the 8U team roster:
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            <div style={{ ...glassStyle, padding: '1.5rem', textAlign: 'center', transition: 'transform 0.3s, box-shadow 0.3s' }} className="hover-lift-glow glass-card">
              <div style={{ height: '200px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <img src="/images/uniform-front.jpg" alt="Uniform Front" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#FFF' }}>Custom Compression Shirt & Short Set</h3>
              <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Front view featuring the custom Delray Rocks R.T.G branding, green camo pattern, player number, and athletic shorts with zipper pockets.</p>
            </div>
            
            <div style={{ ...glassStyle, padding: '1.5rem', textAlign: 'center', transition: 'transform 0.3s, box-shadow 0.3s' }} className="hover-lift-glow glass-card">
              <div style={{ height: '200px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <img src="/images/uniform-back.jpg" alt="Uniform Back" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#FFF' }}>Customized Name & Number Back</h3>
              <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Back view featuring player name customization, large roster number, and 561 Athletics league badge.</p>
            </div>
            
            <div style={{ ...glassStyle, padding: '1.5rem', textAlign: 'center', transition: 'transform 0.3s, box-shadow 0.3s' }} className="hover-lift-glow glass-card">
              <div style={{ height: '200px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <img src="/images/gear-bags.png" alt="Player Bags" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#FFF' }}>Delray Rocks Duffle & Backpack Set</h3>
              <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Heavy-duty player duffle bag and customized backpack set for carrying pads, helmets, and gear to practices and games.</p>
            </div>
          </div>

          <div style={{ ...glassStyle, padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(34,197,94,0.4)', background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(21,128,61,0.1) 100%)', boxShadow: '0 0 20px rgba(34,197,94,0.2)' }} className="glass-card">
            <div>
              <div style={{ fontSize: '1rem', color: '#4ADE80', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '0.25rem' }}>Total Sponsorship Package Contribution</div>
              <div style={{ color: '#E2E8F0', fontSize: '0.9rem' }}>Fully funds all player uniform shortsets and gear bags for the 8U division</div>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, ...textGradient, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>$1,000</div>
          </div>
        </section>

        {/* Integrated Outreach */}
        <section className="fade-section" style={{ marginBottom: '4rem' }}>
          <h2 className="proposal-title-h2" style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '2rem', position: 'relative', paddingBottom: '0.75rem', color: '#FFF' }}>The Integrated Outreach & Promotion Campaign</h2>
          <p style={{ color: '#E2E8F0', lineHeight: 1.7, fontSize: '1.125rem', marginBottom: '2rem' }}>
            To ensure active engagement and show our deep appreciation, the Delray Rocks will execute a structured, ongoing promotion campaign across the season:
          </p>
          
          <div style={{ ...glassStyle, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2.5rem' }} className="glass-card">
            
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #D97706, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 700, color: '#FFF', flexShrink: 0, boxShadow: '0 4px 15px rgba(217,119,6,0.4)' }}>1</div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#FFF' }}>
                  <Users size={20} color="#4ADE80" /> Family Signups
                </h3>
                <p style={{ color: '#E2E8F0', lineHeight: 1.6 }}>
                  Parents register their youth players and RSVP to attend a Sunday service or campus block party via our customized landing page: <a href="https://signup.f1rstposition.com" target="_blank" rel="noopener noreferrer" style={{ color: '#22C55E', textDecoration: 'none', borderBottom: '1px solid #22C55E' }}>signup.f1rstposition.com</a>.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #15803D, #22C55E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 700, color: '#FFF', flexShrink: 0, boxShadow: '0 4px 15px rgba(34,197,94,0.4)' }}>2</div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#FFF' }}>
                  <Calendar size={20} color="#4ADE80" /> Monthly Coastal Service Sundays
                </h3>
                <p style={{ color: '#E2E8F0', lineHeight: 1.6 }}>
                  The Delray Rocks will host a designated service Sunday once a month. The coaching staff will organize a group visit where coaches, players, and families attend a Coastal Community Church service together.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #15803D, #22C55E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 700, color: '#FFF', flexShrink: 0, boxShadow: '0 4px 15px rgba(34,197,94,0.4)' }}>3</div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#FFF' }}>
                  <MessageCircle size={20} color="#4ADE80" /> Active Promotion in Family Group Chats & Practices
                </h3>
                <p style={{ color: '#E2E8F0', lineHeight: 1.6 }}>
                  The team will promote Coastal Community Church events and services directly inside the active family group chat and share announcements during weekly team practices to encourage regular family attendance.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* Next Steps */}
        <section className="fade-section" style={{ marginBottom: '4rem' }}>
          <div style={{ ...glassStyle, padding: '2.5rem' }} className="glass-card">
            <h2 className="proposal-title-h2" style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '1.5rem', position: 'relative', paddingBottom: '0.75rem', color: '#FFF' }}>Next Steps</h2>
            <p style={{ color: '#E2E8F0', lineHeight: 1.7, fontSize: '1.125rem', marginBottom: '1rem' }}>
              Once Coastal Community Church confirms and funds the $1,000 sponsorship, we will immediately place the order for the complete 8U sports package (compression shortsets and gear bags for every player on the roster) and begin coordinating with the coaching staff to announce the next Coastal Service Sunday date to all of our families.
            </p>
            <p style={{ color: '#E2E8F0', lineHeight: 1.7, fontSize: '1.125rem', marginBottom: '1rem' }}>
              From there, the team will spread the word across the active family group chat and at practices, rallying families around the upcoming service and kicking off the promotion campaign from day one.
            </p>
            <p style={{ color: '#E2E8F0', lineHeight: 1.7, fontSize: '1.125rem' }}>
              We are excited to build this partnership and make a lasting impact together in Delray Beach and West Boca.
            </p>
          </div>
        </section>

        {/* Links Card */}
        <section className="fade-section" style={{ marginBottom: '4rem', display: 'flex', justifyContent: 'center' }}>
          <a href="https://signup.f1rstposition.com" target="_blank" rel="noopener noreferrer" style={{ ...glassStyle, padding: '1.5rem 2.5rem', display: 'flex', alignItems: 'center', gap: '1rem', color: '#F8FAFC', textDecoration: 'none', transition: 'all 0.3s' }} className="hover-glow glass-card">
            <ExternalLink size={24} color="#22C55E" />
            <span style={{ fontSize: '1.125rem', fontWeight: 500 }}>Visit the Signup Portal: signup.f1rstposition.com</span>
          </a>
        </section>

        {/* Footer */}
        <footer style={{ ...glassStyle, padding: '2rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.875rem' }} className="glass-card">
          <p>© 2026 Delray Beach Rocks Youth Football Association.</p>
        </footer>

      </div>

      <style jsx global>{`
        .bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          animation: float 10s ease-in-out infinite;
          z-index: 0;
          pointer-events: none;
        }

        @keyframes float {
          0% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
          100% { transform: translateY(0px) scale(1); }
        }

        .fade-section {
          opacity: 0;
          transform: translateY(30px);
          animation: none;
          transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        }

        .fade-section.animate-in {
          animation: fadeInUp 0.8s ease-out forwards;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .hover-glow:hover {
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.15) !important;
          background: rgba(255, 255, 255, 0.08) !important;
        }

        .hover-lift-glow:hover {
          transform: translateY(-8px);
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 255, 255, 0.1) !important;
          background: rgba(255, 255, 255, 0.08) !important;
        }

        .proposal-title-h2::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 60px;
          height: 4px;
          background: linear-gradient(135deg, #15803D, #22C55E);
          border-radius: 2px;
        }

        @media print {
          body, .proposal-container {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .bg-orb {
            display: none !important;
          }
          .glass-card {
            background: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            color: #000 !important;
          }
          .fade-section {
            opacity: 1 !important;
            transform: none !important;
            animation: none !important;
          }
          * {
            color: #000 !important;
            text-shadow: none !important;
          }
          .proposal-title-h2 {
            color: #000 !important;
          }
          .proposal-title-h2::after {
            background: #000 !important;
          }
        }
      `}</style>
    </div>
  );
}
