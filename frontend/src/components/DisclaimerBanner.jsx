import { useState } from 'react';
import { ShieldAlert, X, Info } from 'lucide-react';

export default function DisclaimerBanner({ compact = false }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  if (compact) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(59, 130, 246, 0.05)',
        border: '1px solid rgba(59, 130, 246, 0.15)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 11,
        color: 'var(--text-muted)',
        marginTop: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Info size={13} color="#06b6d4" />
          <span>FinAdvisor AI provides educational guidance based on your inputs. Not certified financial/tax advice.</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'linear-gradient(90deg, rgba(30, 64, 175, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%)',
      border: '1px solid rgba(59, 130, 246, 0.25)',
      borderRadius: 10,
      padding: '10px 16px',
      marginBottom: 20,
      fontSize: 12,
      color: '#cbd5e1'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: 'rgba(59, 130, 246, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <ShieldAlert size={16} color="#38bdf8" />
        </div>
        <div>
          <span style={{ fontWeight: 600, color: '#f1f5f9', marginRight: 6 }}>Financial Education Disclaimer:</span>
          <span>
            Calculations, health scores, and AI recommendations are automated estimations for educational planning. Always verify with a certified financial advisor before major investments.
          </span>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          padding: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Dismiss notice"
      >
        <X size={15} />
      </button>
    </div>
  );
}
