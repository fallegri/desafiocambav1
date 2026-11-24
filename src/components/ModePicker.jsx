import PillButton from './PillButton'
import './ModePicker.css'

// Mode picker used by the intro/instructions screen of the trivia-style
// categories. Keeping it shared means "solo" and "1 vs 1" always look and
// behave the same in every category that supports both.
export default function ModePicker({ onSelect }) {
  return (
    <div className="mode-picker">
      <PillButton label="Jugar solo" onClick={() => onSelect('solo')} />
      <PillButton label="Jugar 1 vs 1" variant="ghost" onClick={() => onSelect('vs')} />
    </div>
  )
}
