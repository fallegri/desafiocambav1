import TornCard from './TornCard'
import PillButton from './PillButton'
import './RoundEndScreen.css'

export default function RoundEndScreen({
  message,
  title = '¡Mioj!',
  titleBold = 'Facilingo',
  subtitle = '¡Volvamos de una vez!',
  score,
  maxScore,
  players,
  onBackToWheel,
}) {
  // `message` is a legacy override (used only by CategoryRouter's
  // defensive dev-stub fallback for an unknown category id) — it skips
  // the styled TornCard layout entirely and just prints the raw string.
  if (message) {
    return (
      <div className="round-end-screen round-end-screen--plain">
        <p>{message}</p>
        <PillButton label="Ir a la ruleta" onClick={onBackToWheel} />
      </div>
    )
  }

  return (
    <div className="round-end-screen">
      <div className="card-with-actions">
        <TornCard>
          <h2 className="round-end-screen__title">
            {title}
            <br />
            <span className="round-end-screen__title-bold">{titleBold}</span>
          </h2>
          <p className="round-end-screen__subtitle">{subtitle}</p>
          {Number.isFinite(score) && Number.isFinite(maxScore) && (
            <p className="round-end-screen__score" role="status">
              {score} / {maxScore} puntos
            </p>
          )}
          {Array.isArray(players) && players.length > 0 && (
            <ul className="round-end-screen__players" aria-label="Puntajes por jugador">
              {players.map((player) => (
                <li key={player.name} className="round-end-screen__player">
                  <span className="round-end-screen__player-name">{player.name}</span>
                  <span className="round-end-screen__player-score">
                    {player.hits}/{player.total} · {player.score} pts
                  </span>
                </li>
              ))}
            </ul>
          )}
        </TornCard>
        <PillButton label="Ir a la ruleta" onClick={onBackToWheel} />
      </div>
    </div>
  )
}
