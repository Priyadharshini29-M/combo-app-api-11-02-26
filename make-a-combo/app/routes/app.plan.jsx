import React, { useState } from 'react';
import {
  Page,
  Icon,
} from '@shopify/polaris';
import {
  CheckIcon,
  ChevronDownIcon,
} from '@shopify/polaris-icons';
import '../app.plan.css';

export default function PlanPage() {
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const plans = [
    {
      title: 'Starter',
      price: 'Free',
      description: 'For new shops finding their rhythm.',
      features: [
        '1 Active Combo Page',
        'Standard Templates',
        'Basic Discount Logic',
        'Email Support',
        '100 Monthly Views',
      ],
      buttonText: 'Current Plan',
      buttonClass: 'cta-button btn-disabled',
      recommended: false,
    },
    {
      title: 'Professional',
      price: '$19.99',
      period: '/mo',
      description: 'Everything you need to spark revenue.',
      features: [
        'Unlimited Combo Pages',
        'All Premium Templates',
        'Tiered Discount Engine',
        'Priority Support',
        'Analytics Dashboard',
        "Remove 'Powered by' badge",
        'Custom CSS Access',
      ],
      buttonText: 'Upgrade Now',
      buttonClass: 'cta-button btn-primary',
      recommended: true,
    },
    {
      title: 'Enterprise',
      price: '$49.99',
      period: '/mo',
      description: 'High-volume solutions for large stores.',
      features: [
        'Unlimited Everything',
        'Custom Feature Development',
        'Dedicated Account Manager',
        'API & Webhook Access',
        'White-label Solution',
        'Advanced Fraud Protection',
      ],
      buttonText: 'Contact Enterprise',
      buttonClass: 'cta-button btn-dark',
      recommended: false, 
    },
  ];

  const faqs = [
    {
      question: 'Can I change plans anytime?',
      answer: 'Yes, you can upgrade or downgrade your plan at any time directly from the settings panel. Changes are prorated to your next billing cycle.',
    },
    {
      question: 'Is there a transaction fee?',
      answer: 'No, we do not charge any additional transaction fees on top of your Shopify payment processing fees. Your success is our success.',
    },
    {
      question: 'Can I use multiple templates on the same shop?',
      answer: 'Yes! Our Professional and Enterprise plans allow you to mix and match multiple combo templates across your entire store to create the perfect shopping experience.',
    },
    {
      question: 'What happens if I exceed my view limit?',
      answer: 'On the Starter plan, your combo pages will continue to function, but you will receive a notification to upgrade. We never shut down your offers during peak sales.',
    },
  ];

  return (
    <Page fullWidth>
      <div className="plan-page-wrapper">
        <header className="plan-header">
          <span className="plan-badge-top">Pricing</span>
          <h1>The Modern Merchant’s Ledger</h1>
          <p>
            Choose a plan that scales with your ambition. No hidden fees, just
            growth-focused tools for your Shopify store.
          </p>
        </header>

        <main className="plan-grid">
          {plans.map((plan, index) => (
            <div
              key={plan.title}
              className={`pricing-card ${plan.recommended ? 'recommended' : ''}`}
            >
              {plan.recommended && (
                <div className="recommended-label">RECOMMENDED</div>
              )}
              <h3 className="plan-name">{plan.title}</h3>
              <div className="plan-price">
                {plan.price}
                {plan.period && <span>{plan.period}</span>}
              </div>
              <p className="plan-desc">{plan.description}</p>

              <ul className="feature-list">
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex} className="feature-item">
                    <span className="check-icon">
                      <Icon source={CheckIcon} tone="success" />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button className={plan.buttonClass}>
                {plan.buttonText}
              </button>
            </div>
          ))}
        </main>

        <section className="faq-section">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-container">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`faq-item ${activeFaq === index ? 'active' : ''}`}
                onClick={() => toggleFaq(index)}
              >
                <div className="faq-question">
                  {faq.question}
                  <span className="faq-icon">
                    <Icon source={ChevronDownIcon} tone="base" />
                  </span>
                </div>
                <div className="faq-answer">{faq.answer}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Page>
  );
}

