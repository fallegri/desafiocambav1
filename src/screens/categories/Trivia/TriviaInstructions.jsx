import TornCard from '../../../components/TornCard'
import ModePicker from '../../../components/ModePicker'

export default function TriviaInstructions({ onStart }) {
  return (
    <div className="category-intro explicacion-columns">
      <div className="explicacion-column">
        <TornCard showDecorations={false} frame="suave">
          <h3>Explicación</h3>
          <p>
            En esta trivia se responden preguntas de cultura general y de modismos cruceños,
            benianos y cambas con opción múltiple. Cada respuesta correcta vale 20 puntos.
          </p>
          <p>
            En el modo <strong>1 vs 1</strong> se juegan 10 preguntas y los turnos se alternan:
            Jugador 1 responde la primera, Jugador 2 la segunda, y así hasta el final.
          </p>
        </TornCard>
        <ModePicker onSelect={onStart} />
      </div>
      <div className="explicacion-column">
        <TornCard showDecorations={false} frame="suave">
          <h3>Instrucciones</h3>
          <ol>
            <li>Lee atentamente cada pregunta</li>
            <li>Elegí una de las cuatro opciones antes de que se acabe el tiempo</li>
            <li>Cada acierto suma 20 puntos; en 1 vs 1 gana quien tenga más aciertos</li>
          </ol>
        </TornCard>
        <p className="explicacion-column__time-label">Tiempo de cada pregunta:</p>
        <p className="explicacion-column__time-value">15s</p>
      </div>
    </div>
  )
}
