export default function Loading() {
  return (
    <main className="section">
      <div className="container">
        <div className="card loadingCard" role="status">
          <span className="eyebrow">MOJMEŠTAR</span>
          <h2>Učitavanje...</h2>
          <div className="loadingBar" aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
