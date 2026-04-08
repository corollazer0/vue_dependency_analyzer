import type { Directive } from 'vue'

export const vPermission: Directive = {
  mounted(el, binding) {
    const required = binding.value
    // role check logic
    if (!required) el.style.display = 'none'
  }
}
