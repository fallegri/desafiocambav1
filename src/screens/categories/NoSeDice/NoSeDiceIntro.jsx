import TornCard from '../../../components/TornCard'
import ModePicker from '../../../components/ModePicker'

export default function NoSeDiceIntro({ onStart }) {
  return (
    <div className="category-intro">
      <div className="card-with-actions">
        <TornCard>
          <h2 className="category-title">
            No se dice...
            <span className="category-title__highlight">se dice...</span>
          </h2>
          <p className="category-title__subtitle">Cuidado eh cunumi, demuestra que tan cambanga soj</p>
          <p>En 1 vs 1 cada jugador tiene su propia tarjeta y 10s para adivinarla.</p>
        </TornCard>
        <ModePicker onSelect={onStart} />
      </div>
    </div>
  )
}
