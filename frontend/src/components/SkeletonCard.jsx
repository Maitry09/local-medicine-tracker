import '../styles/skeleton.css';  // we'll create this too

// A single skeleton card that matches the medicine card shape
export const MedicineSkeletonCard = () => (
  <div className="card medicine-card skeleton-card">
    <div className="card-body">
      <div className="skeleton-line skeleton-short" />
      <div className="skeleton-line skeleton-full" style={{ marginTop: '0.5rem' }} />
      <div className="skeleton-line skeleton-medium" style={{ marginTop: '0.25rem' }} />
      <div className="skeleton-line skeleton-short" style={{ marginTop: '1rem' }} />
    </div>
    <div className="card-footer">
      <div className="skeleton-line skeleton-medium" />
    </div>
  </div>
);

// A single skeleton row that matches a pharmacy list item
export const PharmacySkeletonRow = () => (
  <div className="pharmacy-card skeleton-card" style={{ padding: '1rem', marginBottom: '0.75rem' }}>
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <div className="skeleton-avatar" />
      <div style={{ flex: 1 }}>
        <div className="skeleton-line skeleton-full" />
        <div className="skeleton-line skeleton-medium" style={{ marginTop: '0.5rem' }} />
        <div className="skeleton-line skeleton-short" style={{ marginTop: '0.25rem' }} />
      </div>
    </div>
  </div>
);

// Renders N skeleton cards in a grid
export const MedicineSkeletonGrid = ({ count = 8 }) => (
  <div className="grid grid-4">
    {Array.from({ length: count }).map((_, i) => (
      <MedicineSkeletonCard key={i} />
    ))}
  </div>
);

// Renders N skeleton rows in a list
export const PharmacySkeletonList = ({ count = 5 }) => (
  <div>
    {Array.from({ length: count }).map((_, i) => (
      <PharmacySkeletonRow key={i} />
    ))}
  </div>
);