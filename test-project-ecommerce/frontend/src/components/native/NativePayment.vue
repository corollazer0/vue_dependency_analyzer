<script setup lang="ts">


const emit = defineEmits(['payment-success', 'payment-error'])
function nativeAction0() {
  window.NativeApp.requestPayment()
}
function nativeAction1() {
  window.AndroidBridge.googlePay()
}
function nativeAction2() {
  window.iOSBridge.applePay()
}
</script>

<template>
  <div class="nativepayment">
    <h2>{{ 'NativePayment' }}</h2>


  </div>
</template>
