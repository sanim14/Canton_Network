import React from 'react';
import { Link } from 'react-router-dom';
import { PARTY_META } from '../types';

const RegisterPage: React.FC = () => (
  <div style={{
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg)', padding: 24,
  }}>
    <div style={{ width: 600, maxWidth: '100%' }}>
      <Link to="/login" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)',
        textDecoration: 'none', marginBottom: 32,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to Sign In
      </Link>

      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" style={{ marginBottom: 16 }}>
          <circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m-10-10h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
        </svg>
        <h1 className="ts-gradient-heading" style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          Canton Party Registration
        </h1>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)', maxWidth: 440, margin: '0 auto', lineHeight: 1.6 }}>
          In production, Canton parties are provisioned at the infrastructure level by the domain operator.
          The sandbox includes 4 pre-configured test parties.
        </p>
      </div>

      {/* 4-Party Model Diagram */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 24, marginBottom: 20,
      }}>
        <h3 style={{
          fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-2)',
          marginBottom: 16,
        }}>4-Party Model</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {Object.entries(PARTY_META).map(([key, meta]) => (
            <div key={key} style={{
              padding: '12px 14px', borderRadius: 8,
              background: meta.color + '0a', border: `1px solid ${meta.color}22`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{
                width: 32, height: 32, borderRadius: 6,
                background: meta.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: meta.color,
                flexShrink: 0,
              }}>{meta.short}</span>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                  {meta.label}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)' }}>
                  {meta.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Production Requirements */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 24, marginBottom: 20,
      }}>
        <h3 style={{
          fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-2)',
          marginBottom: 16,
        }}>Production Requirements</h3>
        {[
          { label: 'Party Provisioning', desc: 'Parties are created by the Canton domain operator as part of network onboarding.' },
          { label: 'Identity Verification', desc: 'Real-world identity verified through DAO governance process before party creation.' },
          { label: 'Stake Requirements', desc: 'Minimum stake may be required to participate as a strategist, defined by DAO config.' },
          { label: 'Governance Approval', desc: 'Existing DAO members vote to approve new member parties through on-chain governance.' },
        ].map((item, i) => (
          <div key={i} style={{
            padding: '10px 0',
            borderBottom: i < 3 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
              {item.label}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
              {item.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Canton Docs Link */}
      <div style={{
        background: '#a78bfa0a', border: '1px solid #a78bfa22',
        borderRadius: 12, padding: 20, textAlign: 'center',
      }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>
          Learn more about Canton Network
        </div>
        <a
          href="https://docs.digitalasset.com/build/3.3/quickstart/operate/explore-the-demo.html"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: 'var(--mono)', fontSize: 12, color: '#a78bfa',
            textDecoration: 'none',
          }}
        >
          Canton Documentation &rarr;
        </a>
      </div>

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Link to="/login" style={{
          fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)',
          textDecoration: 'none',
        }}>
          &larr; Back to Sign In
        </Link>
      </div>
    </div>
  </div>
);

export default RegisterPage;
