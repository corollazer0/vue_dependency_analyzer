<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  modelValue: number;
  min?: number;
  max?: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: number];
}>();

const dragging = ref(false);

function onMouseDown(e: MouseEvent) {
  e.preventDefault();
  dragging.value = true;
  const startX = e.clientX;
  const startWidth = props.modelValue;

  function onMouseMove(e: MouseEvent) {
    const delta = e.clientX - startX;
    const newWidth = Math.max(props.min || 100, Math.min(props.max || 600, startWidth + delta));
    emit('update:modelValue', newWidth);
  }

  function onMouseUp() {
    dragging.value = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}
</script>

<template>
  <div
    @mousedown="onMouseDown"
    class="w-1 cursor-col-resize flex-shrink-0 transition-colors relative group"
    :class="dragging ? 'bg-blue-500/50' : ''"
    style="background: var(--border-subtle)"
  >
    <div
      class="absolute inset-y-0 -left-1 -right-1 group-hover:bg-blue-500/20 transition-colors"
      :class="dragging ? 'bg-blue-500/30' : ''"
    ></div>
  </div>
</template>
