import { useCallback } from 'react'
import './RatingInput.css'

/**
 * Mobile-optimized 1-10 rating input with tap-to-select
 * Touch targets are 44px minimum for accessibility
 * Color-coded: red (1-3), orange (4-5), yellow (6-7), green (8-10)
 */
const RatingInput = ({ value, onChange, disabled = false }) => {
  const handleSelect = useCallback((rating) => {
    if (disabled) return
    onChange(rating)
  }, [onChange, disabled])

  const getRatingClass = (rating) => {
    if (rating <= 3) return 'rating-input__btn--low'
    if (rating <= 5) return 'rating-input__btn--medium-low'
    if (rating <= 7) return 'rating-input__btn--medium-high'
    return 'rating-input__btn--high'
  }

  return (
    <div className={`rating-input ${disabled ? 'rating-input--disabled' : ''}`}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
        <button
          key={rating}
          type="button"
          className={`rating-input__btn ${getRatingClass(rating)} ${value === rating ? 'rating-input__btn--active' : ''}`}
          onClick={() => handleSelect(rating)}
          disabled={disabled}
          aria-label={`Rate ${rating} out of 10`}
          aria-pressed={value === rating}
        >
          {rating}
        </button>
      ))}
    </div>
  )
}

export default RatingInput
