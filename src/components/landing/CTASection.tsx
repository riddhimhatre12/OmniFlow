import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

interface CTASectionProps {
  onNavigate: (route: string) => void;
}

export const CTASection: React.FC<CTASectionProps> = ({ onNavigate }) => {
  return (
    <section
      style={{
        padding: '96px 24px',
        backgroundColor: 'var(--slate-900)',
        color: 'var(--white)',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2
          style={{
            fontSize: 'clamp(32px, 4.5vw, 48px)',
            fontWeight: 800,
            letterSpacing: '-1.2px',
            color: 'var(--white)',
            marginBottom: '20px',
            lineHeight: 1.15,
          }}
        >
          Build your workspace your way.
        </h2>

        <p
          style={{
            fontSize: '18px',
            color: 'var(--slate-300)',
            lineHeight: 1.6,
            marginBottom: '36px',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Experience a streamlined interface that eliminates organizational fragmentation
          and unifies teams under one structured operating system.
        </p>

        <Button
          size="lg"
          variant="primary"
          onClick={() => onNavigate('/login')}
          icon={<ArrowRight size={18} />}
          iconPosition="right"
          style={{
            padding: '14px 32px',
            backgroundColor: 'var(--primary)',
          }}
        >
          Get Started
        </Button>
      </div>
    </section>
  );
};
