import { ref, reactive } from 'vue'

export function useForm<T extends Record<string, unknown>>(initial: T) {
  const form = reactive({ ...initial })
  const isDirty = ref(false)
  const errors = ref<Record<string, string>>({})
  function reset() { Object.assign(form, initial); isDirty.value = false }
  function validate() { return Object.keys(errors.value).length === 0 }
  return { form, isDirty, errors, reset, validate }
}
