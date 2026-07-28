import { ref, watch, unref, type Ref } from 'vue'
import { z } from 'zod'

export function useFormValidation<T extends z.ZodTypeAny>(schema: T | Ref<T>, state: Record<string, any>) {
  const errors = ref<Record<string, string>>({})
  const touched = ref<Record<string, boolean>>({})

  // Validate a single field
  const validateField = (field: string) => {
    try {
      const activeSchema = unref(schema)
      if (activeSchema instanceof z.ZodObject) {
        // We only want to validate this specific field against its schema if possible.
        // The easiest way to handle cross-field validation while maintaining real-time feedback
        // is to parse the whole object and extract the error for this field.
        activeSchema.parse(state)
        // If it passes, clear all errors
        errors.value = {}
      } else {
        activeSchema.parse(state)
        errors.value = {}
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        for (const issue of err.errors) {
          const path = issue.path.join('.')
          if (!fieldErrors[path]) {
            fieldErrors[path] = issue.message
          }
        }
        
        // If the specific field we are validating has an error, update it.
        // If it no longer has an error, clear it.
        if (fieldErrors[field]) {
          errors.value[field] = fieldErrors[field]
        } else {
          delete errors.value[field]
        }
        
        // Also clear any other errors that have been resolved
        Object.keys(errors.value).forEach(k => {
          if (!fieldErrors[k]) delete errors.value[k]
        })
      }
    }
  }

  // Validate entire form (used before submit)
  const validate = (): boolean => {
    try {
      const activeSchema = unref(schema)
      activeSchema.parse(state)
      errors.value = {}
      // Mark all fields as touched
      Object.keys(state).forEach(k => touched.value[k] = true)
      return true
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        for (const issue of err.errors) {
          const path = issue.path.join('.')
          if (!fieldErrors[path]) {
            fieldErrors[path] = issue.message
          }
          touched.value[path] = true
        }
        errors.value = fieldErrors
      }
      return false
    }
  }

  const setErrors = (serverErrors: Record<string, string>) => {
    errors.value = { ...serverErrors }
    Object.keys(serverErrors).forEach(k => touched.value[k] = true)
  }

  const clearErrors = () => {
    errors.value = {}
    touched.value = {}
  }

  const touch = (field: string) => {
    touched.value[field] = true
    validateField(field)
  }

  // Watch for changes to validate in real-time
  watch(state, (newState, oldState) => {
    // Find which keys changed to mark them as touched and validate them
    // For deep objects this is simplified, but works well for flat reactive forms.
    Object.keys(newState).forEach(key => {
      if (newState[key] !== oldState[key] || touched.value[key]) {
        if (touched.value[key]) {
           validateField(key)
        }
      }
    })
  }, { deep: true })

  return {
    errors,
    touched,
    validate,
    validateField,
    setErrors,
    clearErrors,
    touch
  }
}
