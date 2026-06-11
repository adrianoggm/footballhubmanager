import { useCallback, useState } from 'react'

/**
 * Lightweight form-state helper that replaces the ~10 inline
 * `onXField = (name) => (event) => setX((prev) => ({ ...prev, [name]: value }))`
 * closures duplicated across the dashboards.
 *
 * @param {object|Function} initialValues - initial values, or a factory returning them
 *   (mirrors the existing `useState(defaultSeasonForm)` convention).
 *
 * Returns:
 *  - values: current form object
 *  - setValues: raw setter (functional updates supported)
 *  - setField(name, value): set a single field
 *  - onField(name, transform?): MUI-friendly change handler factory;
 *      `transform(rawValue)` lets callers coerce (e.g. Number for points_* fields)
 *  - reset(next?): reset to `next`, or back to the initial values
 */
export function useForm(initialValues) {
  const makeInitial = useCallback(
    () => (typeof initialValues === 'function' ? initialValues() : initialValues),
    [initialValues]
  )

  const [values, setValues] = useState(makeInitial)

  const setField = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  const onField = useCallback(
    (name, transform) => (event) => {
      const raw = event?.target?.value
      setValues((prev) => ({ ...prev, [name]: transform ? transform(raw) : raw }))
    },
    []
  )

  const reset = useCallback(
    (next) => {
      setValues(next ?? makeInitial())
    },
    [makeInitial]
  )

  return { values, setValues, setField, onField, reset }
}
