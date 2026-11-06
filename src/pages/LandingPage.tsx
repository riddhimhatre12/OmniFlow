import React from 'react';
import { Navbar } from '../components/landing/Navbar';
import { Hero } from '../components/landing/Hero';
import { Features } from '../components/landing/Features';
import { PlatformPreview } from '../components/landing/PlatformPreview';
import { HowItWorks } from '../components/landing/HowItWorks';
import { Pricing } from '../components/landing/Pricing';
import { CTASection } from '../components/landing/CTASection';
import { Footer } from '../components/landing/Footer';

interface LandingPageProps {
  onNavigate: (route: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar onNavigate={onNavigate} />
      <main style={{ flex: 1 }}>
        <Hero onNavigate={onNavigate} />
        <Features />
        <PlatformPreview />
        <HowItWorks />
        <Pricing onNavigate={onNavigate} />
        <CTASection onNavigate={onNavigate} />
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
};
