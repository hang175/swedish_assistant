import { GRAMMAR } from '../grammar';
import { SpeakButton } from '../components/WordBits';

export default function Grammar() {
  return (
    <div className="grammar">
      <aside>
        <h1>Grammar notes</h1>
        <p className="muted small">Short beginner notes (A1–A2). Every Swedish example can be played aloud.</p>
        <ol>
          {GRAMMAR.map((t) => (
            <li key={t.id}>
              <button className="link" onClick={() => document.getElementById(`g-${t.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                {t.title}
              </button>
            </li>
          ))}
        </ol>
      </aside>
      <div className="stack">
        {GRAMMAR.map((t, n) => (
          <section className="card" key={t.id} id={`g-${t.id}`}>
            <h2>
              {n + 1}. {t.title}
            </h2>
            <p className="lead">{t.summary}</p>
            {t.table && (
              <div className="tablewrap">
                <table>
                  <thead>
                    <tr>
                      {t.table.head.map((h, i) => (
                        <th key={i}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.table.rows.map((r, i) => (
                      <tr key={i}>
                        {r.map((c, j) => (
                          <td key={j}>{c}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <ul>
              {t.points.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
            <div className="examples">
              {t.examples.map((ex, i) => (
                <div className="example" key={i}>
                  <SpeakButton text={ex.sv} label="Play sentence" />
                  <div>
                    <div className="sv" lang="sv">
                      {ex.sv}
                    </div>
                    <div className="en">{ex.en}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
