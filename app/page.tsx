import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <section className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow">Banswara's trusted school since 2012</p>
          <h1>Each Child Matters.</h1>
          <p className="lead">Nurturing curious minds from Play Group to Class 12 with care, confidence, and a complete learning journey in Banswara.</p>
          <div className="hero-actions"><Link className="button" href="/admissions">Apply for Admission</Link><Link className="text-link" href="/about">Explore Our School →</Link></div>
          <div className="hero-facts"><span>Co-education</span><span>Play Group to Class 12</span><span>Banswara, Rajasthan</span></div>
        </div>
        <div className="photo-placeholder large" role="img" aria-label="Replace with authentic Blossom School campus or student photography"><span>Authentic Blossom School photography</span></div>
      </section>

      <section className="section shell split">
        <div><p className="eyebrow">A school with warmth</p><h2>Where learning feels personal, steady, and full of possibility.</h2></div>
        <div><p>Blossom School believes every child deserves attention, opportunity and encouragement. The school supports a complete learning journey from the earliest classroom experiences through senior secondary education.</p><Link className="text-link" href="/about">Discover Blossom →</Link></div>
      </section>

      <section className="journey section">
        <div className="shell"><p className="eyebrow">Academic journey</p><h2>A complete academic journey from first steps to board preparation.</h2>
          <div className="journey-list">
            <article><b>01</b><div><h3>Pre-Primary</h3><p>Play Group, Nursery, LKG and UKG with storytelling, music, art, movement and social development.</p></div></article>
            <article><b>02</b><div><h3>Primary & Middle</h3><p>Strong foundations across English, Hindi, Mathematics, Science, Social Studies, reading, projects and activities.</p></div></article>
            <article><b>03</b><div><h3>Secondary & Senior Secondary</h3><p>Structured academic guidance, board preparation, future planning and readiness for the next stage of education.</p></div></article>
          </div>
        </div>
      </section>

      <section className="quote-section"><div className="shell"><blockquote>“We teach children to think, not just to pass.”</blockquote></div></section>

      <section className="section shell"><div className="section-head"><div><p className="eyebrow">Campus life</p><h2>School is more than classrooms.</h2></div><Link className="text-link" href="/campus-life">Explore Campus Life →</Link></div>
        <div className="editorial-grid"><div className="photo-placeholder tall"><span>Sports & Athletics</span></div><div className="photo-placeholder"><span>Creative Activities</span></div><div className="photo-placeholder"><span>Events & Celebrations</span></div><div className="photo-placeholder wide"><span>Art, Music, Dance & Theatre</span></div></div>
      </section>

      <section className="section soft"><div className="shell split"><div><p className="eyebrow">Why Blossom</p><h2>A balanced school experience built around each child.</h2></div><div className="why-list"><p>Personal attention and encouragement</p><p>Complete schooling journey from Play Group to Class 12</p><p>Academic guidance with activities beyond textbooks</p><p>Supportive learning environment and parent communication</p></div></div></section>

      <section className="admission-band"><div className="shell split"><div><p className="eyebrow light">Admissions</p><h2>Begin your child's Blossom journey.</h2></div><div><p>Speak with the school, plan a visit and understand the admission process for your child's class.</p><div className="hero-actions"><Link className="button light-button" href="/admissions">Apply for Admission</Link><a className="text-link light-link" href="tel:+919462252553">Contact Admissions →</a></div></div></div></section>
    </>
  );
}
