"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="fatal">
      <h1>Something interrupted this view.</h1>
      <p>
        Your saved demo data is still in this browser. Try opening the view
        again.
      </p>
      <button className="primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
