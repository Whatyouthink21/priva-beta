import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="wrap page" style={{ paddingTop: 60 }}>
      <div className="nf">
        <div className="nf__code num">404</div>
        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', margin: '6px 0 10px' }}>Nothing rolled here</h1>
        <p className="muted" style={{ maxWidth: '48ch' }}>
          That page is not on Priva. Either the id is wrong, the title was pulled from TMDB, or you followed a link from a
          dream. The safe places are below.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
          <Link className="btn btn--primary" to="/">Back to tonight</Link>
          <Link className="btn btn--outline" to="/search">Search</Link>
          <Link className="btn btn--outline" to="/my">My Priva</Link>
        </div>
      </div>
    </div>
  )
}
