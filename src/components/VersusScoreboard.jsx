import './VersusScoreboard.css'

// Shared 1 vs 1 scoreboard for pass-and-play categories. `players` entries
// carry the hits of the current round (and the round total), while
// `activeIndex` highlights whose turn it is.
export default function VersusScoreboard({ players, activeIndex = null, label = 'VS' }) {
  return (
    <div className="versus-scoreboard" aria-label="Marcador versus">
      {players.map((player, index) => (
        <div
          key={player.name}
          className={`versus-scoreboard__player${
            index === activeIndex ? ' versus-scoreboard__player--active' : ''
          }`}
          aria-current={index === activeIndex ? 'true' : undefined}
        >
          <span className="versus-scoreboard__name">{player.name}</span>
          <span className="versus-scoreboard__score">
            {player.hits}/{player.total}
          </span>
        </div>
      ))}
      <span className="versus-scoreboard__vs" aria-hidden="true">
        {label}
      </span>
    </div>
  )
}
