import React, { useState } from 'react';
import { Check, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface PricingProps {
  onNavigate: (route: string) => void;
}

export const Pricing: React.FC<PricingProps> = ({ onNavigate }) => {
  const [annualBilling, setAnnualBilling] = useState(true);

  const tiers = [
    {
      name: 'Starter',
      description: 'Foundational project and task tracking for agile pods and startups.',
      monthlyPrice: 12,
      annualPrice: 9,
      badge: null,
      highlighted: false,
      ctaText: 'Get Started',
      ctaVariant: 'secondary' as const,
      features: [
        'Up to 10 workspace members',
        'Unlimited active projects & tasks',
        'Standard Kanban & List views',
        '5 GB secure file storage',
        'Community & email support',
        'Essential activity logs',
      ],
    },
    {
      name: 'Professional',
      description: 'Comprehensive workflow orchestration for scaling departments and multi-team initiatives.',
      monthlyPrice: 29,
      annualPrice: 24,
      badge: 'Most Popular',
      highlighted: true,
      ctaText: 'Start 14-Day Free Trial',
      ctaVariant: 'primary' as const,
      features: [
        'Unlimited workspace members',
        'Advanced custom workflows & gates',
        'Timeline, Gantt & Workload views',
        'Role-based access permissions',
        '100 GB cloud attachment storage',
        'Cross-project dependencies',
        'Priority 24/7 technical support',
      ],
    },
    {
      name: 'Enterprise',
      description: 'Maximum governance, compliance, and dedicated infrastructure for large organizations.',
      monthlyPrice: null,
      annualPrice: null,
      customPricing: 'Custom',
      badge: 'Custom Governance',
      highlighted: false,
      ctaText: 'Contact Enterprise Sales',
      ctaVariant: 'secondary' as const,
      features: [
        'Custom workspace partitioning',
        'SAML 2.0 Single Sign-On (SSO)',
        'SCIM automated user provisioning',
        'Audit log streaming & retention',
        'Enterprise 99.99% uptime SLA',
        'Dedicated Technical Account Manager',
        'Custom contractual terms & BAA',
      ],
    },
  ];

  return (
    <section
      id="pricing"
      style={{
        padding: '96px 24px',
        backgroundColor: 'var(--slate-50)',
        borderBottom: '1px solid var(--slate-200)',
      }}
    >
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--white)',
              border: '1px solid var(--slate-200)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--primary)',
              marginBottom: '16px',
            }}
          >
            <Sparkles size={14} />
            <span>Predictable, Transparent Pricing</span>
          </div>

          <h2
            style={{
              fontSize: 'clamp(28px, 3.5vw, 42px)',
              fontWeight: 800,
              letterSpacing: '-1.2px',
              color: 'var(--slate-950)',
              marginBottom: '16px',
              lineHeight: 1.15,
            }}
          >
            Flexible plans designed to scale with your team
          </h2>

          <p style={{ fontSize: '17px', color: 'var(--slate-600)', lineHeight: 1.6 }}>
            Deploy a unified work operating system with no hidden fees or surprise seat overages.
          </p>

          {/* Monthly / Annual Billing Toggle */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: 'var(--white)',
              padding: '6px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--slate-200)',
              marginTop: '32px',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <button
              type="button"
              onClick={() => setAnnualBilling(false)}
              style={{
                padding: '6px 16px',
                borderRadius: 'var(--radius-full)',
                fontSize: '13px',
                fontWeight: 600,
                color: !annualBilling ? 'var(--white)' : 'var(--slate-600)',
                backgroundColor: !annualBilling ? 'var(--slate-900)' : 'transparent',
                transition: 'all 0.15s ease',
              }}
            >
              Monthly Billing
            </button>

            <button
              type="button"
              onClick={() => setAnnualBilling(true)}
              style={{
                padding: '6px 16px',
                borderRadius: 'var(--radius-full)',
                fontSize: '13px',
                fontWeight: 600,
                color: annualBilling ? 'var(--white)' : 'var(--slate-600)',
                backgroundColor: annualBilling ? 'var(--slate-900)' : 'transparent',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Annual Billing</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  backgroundColor: 'var(--primary)',
                  color: 'var(--white)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-xs)',
                  letterSpacing: '0.4px',
                }}
              >
                SAVE 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            alignItems: 'stretch',
          }}
        >
          {tiers.map((tier) => {
            const price = annualBilling ? tier.annualPrice : tier.monthlyPrice;

            return (
              <Card
                key={tier.name}
                padding="lg"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: 'var(--radius-lg)',
                  position: 'relative',
                  backgroundColor: 'var(--white)',
                  border: tier.highlighted
                    ? '2px solid var(--primary)'
                    : '1px solid var(--slate-200)',
                  boxShadow: tier.highlighted ? 'var(--shadow-lg)' : 'var(--shadow-xs)',
                  transform: tier.highlighted ? 'scale(1.02)' : 'none',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                {/* Top Badge */}
                {tier.badge && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-13px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: tier.highlighted ? 'var(--primary)' : 'var(--slate-800)',
                      color: 'var(--white)',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 14px',
                      borderRadius: 'var(--radius-full)',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    {tier.badge}
                  </div>
                )}

                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <h3
                      style={{
                        fontSize: '22px',
                        fontWeight: 800,
                        color: 'var(--slate-900)',
                        letterSpacing: '-0.4px',
                        marginBottom: '6px',
                      }}
                    >
                      {tier.name}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--slate-500)', minHeight: '38px', lineHeight: 1.5 }}>
                      {tier.description}
                    </p>
                  </div>

                  {/* Price display */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '4px',
                      padding: '16px 0',
                      borderTop: '1px solid var(--slate-150)',
                      borderBottom: '1px solid var(--slate-150)',
                      marginBottom: '24px',
                    }}
                  >
                    {tier.customPricing ? (
                      <span style={{ fontSize: '36px', fontWeight: 800, color: 'var(--slate-950)' }}>
                        {tier.customPricing}
                      </span>
                    ) : (
                      <>
                        <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--slate-500)' }}>
                          $
                        </span>
                        <span
                          style={{
                            fontSize: '40px',
                            fontWeight: 800,
                            letterSpacing: '-1.5px',
                            color: 'var(--slate-950)',
                            fontFamily: 'var(--font-sans)',
                          }}
                        >
                          {price}
                        </span>
                        <span style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: 500 }}>
                          / user / month
                        </span>
                      </>
                    )}
                  </div>

                  {/* Features list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--slate-400)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                      }}
                    >
                      Includes
                    </div>
                    {tier.features.map((feature, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            backgroundColor: tier.highlighted ? 'var(--primary-light)' : 'var(--slate-100)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Check size={12} color={tier.highlighted ? 'var(--primary)' : 'var(--slate-700)'} />
                        </div>
                        <span style={{ fontSize: '13px', color: 'var(--slate-700)', lineHeight: 1.4 }}>
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card CTA Button */}
                <Button
                  variant={tier.ctaVariant}
                  size="md"
                  onClick={() => onNavigate('/login')}
                  icon={<ArrowRight size={16} />}
                  iconPosition="right"
                  style={{ width: '100%' }}
                >
                  {tier.ctaText}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Security & Guarantee Note */}
        <div
          style={{
            marginTop: '48px',
            padding: '20px 24px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--white)',
            border: '1px solid var(--slate-200)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={20} color="var(--primary)" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--slate-900)' }}>
                30-Day Enterprise Money-Back Guarantee
              </div>
              <div style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                Try OmniFlow risk-free. Cancel anytime with 1-click workspace export.
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('/login')}
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <span>Compare full feature matrix</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
};
