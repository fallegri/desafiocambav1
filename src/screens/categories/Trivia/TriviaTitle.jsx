import TornCard from '../../../components/TornCard'
import PillButton from '../../../components/PillButton'

export default function TriviaTitle({ onStart }) {
  return (
    <div className="category-intro">
      <div className="card-with-actions">
        <TornCard>
          <h2 className="category-title">
            ¡Trivia de
            <span className="category-title__highlight">Cultura general!</span>
          </h2>
          <p className="category-title__subtitle">
            Cultura general y modismos cruceños, benianos y cambas
          </p>
          <p>Tienes 15s por pregunta</p>
        </TornCard>
        <PillButton label="¡Inicia!" onClick={onStart} />
      </div>
    </div>
  )
}
