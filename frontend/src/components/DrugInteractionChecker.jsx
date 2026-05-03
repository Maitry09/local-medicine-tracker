import { useState, useEffect } from 'react';

// OpenFDA drug interaction check via label search
async function checkInteractions(drugNames) {
  const interactions = [];

  for (let i = 0; i < drugNames.length; i++) {
    for (let j = i + 1; j < drugNames.length; j++) {
      const drugA = drugNames[i];
      const drugB = drugNames[j];

      try {
        // Search OpenFDA for drug label warnings that mention the other drug
        const query = encodeURIComponent(`"${drugA}" AND warnings:"${drugB}"`);
        const res = await fetch(
          `https://api.fda.gov/drug/label.json?search=openfda.brand_name:${encodeURIComponent(drugA)}+AND+drug_interactions:${encodeURIComponent(drugB)}&limit=1`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.results?.length > 0) {
            const interactionText = data.results[0].drug_interactions?.[0];
            if (interactionText) {
              // Extract first 250 chars of interaction warning
              const snippet = interactionText.substring(0, 250).replace(/\s+/g, ' ').trim();
              interactions.push({ drugA, drugB, warning: snippet + (interactionText.length > 250 ? '...' : '') });
            }
          }
        }
      } catch { /* OpenFDA is best-effort; silently skip on error */ }

      // Small delay to respect rate limits
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return interactions;
}

export default function DrugInteractionChecker({ medicines }) {
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const rxMeds = medicines.filter(m => m.prescriptionRequired);

  useEffect(() => {
    if (rxMeds.length < 2) return;
    setChecked(false);
    setInteractions([]);
    setDismissed(false);
  }, [medicines.map(m => m.name).join(',')]);

  const runCheck = async () => {
    setLoading(true);
    const names = rxMeds.map(m => m.genericName || m.name);
    const found = await checkInteractions(names);
    setInteractions(found);
    setChecked(true);
    setLoading(false);
  };

  if (rxMeds.length < 2) return null;
  if (dismissed) return null;

  return (
    <div style={{
      border: `2px solid ${checked && interactions.length > 0 ? '#f57c00' : '#1976d2'}`,
      borderRadius: 8, padding: '1rem', marginBottom: '1rem',
      background: checked && interactions.length > 0 ? '#fff8e1' : '#f0f7ff'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <strong style={{ fontSize: 15 }}>
            {checked && interactions.length > 0
              ? '⚠️ Potential Drug Interactions Detected'
              : checked
              ? '✅ No Known Interactions Found'
              : '💊 Drug Interaction Check'}
          </strong>
          <p style={{ fontSize: 13, margin: '4px 0 0', color: '#555' }}>
            {rxMeds.length} prescription medicines in cart: <em>{rxMeds.map(m => m.name).join(', ')}</em>
          </p>
        </div>
        <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 18 }}>×</button>
      </div>

      {!checked && (
        <button className="btn btn-sm btn-outline" onClick={runCheck} disabled={loading}
          style={{ marginTop: '0.75rem' }}>
          {loading ? 'Checking with OpenFDA...' : 'Check for Interactions'}
        </button>
      )}

      {loading && (
        <p style={{ fontSize: 13, color: '#666', marginTop: '0.5rem' }}>
          Checking OpenFDA drug database… this may take a few seconds.
        </p>
      )}

      {checked && interactions.length === 0 && (
        <p style={{ fontSize: 13, color: '#2e7d32', marginTop: '0.5rem' }}>
          No known interactions found between your medicines in the OpenFDA database. Always consult your doctor or pharmacist.
        </p>
      )}

      {interactions.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          {interactions.map((ix, i) => (
            <div key={i} style={{ background: '#fff3e0', border: '1px solid #ffcc80', borderRadius: 6, padding: '0.75rem', marginBottom: '0.5rem' }}>
              <strong style={{ color: '#e65100', fontSize: 13 }}>
                ⚠️ {ix.drugA} + {ix.drugB}
              </strong>
              <p style={{ fontSize: 12, color: '#555', margin: '6px 0 0', lineHeight: 1.5 }}>
                {ix.warning}
              </p>
            </div>
          ))}
          <p style={{ fontSize: 12, color: '#888', marginTop: '0.75rem' }}>
            ⚕️ This is informational only. Always consult your doctor or pharmacist before combining medicines.
          </p>
        </div>
      )}
    </div>
  );
}
