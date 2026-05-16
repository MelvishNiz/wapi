<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-sm font-medium text-white">QR Code</p>
        <p class="text-xs text-gray-400">Scan from WhatsApp linked devices.</p>
      </div>
      <div class="w-fit px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
        Scan with WhatsApp
      </div>
    </div>

    <div class="flex flex-col items-center gap-6">
      <div class="qr-container">
        <div class="qr-inner aspect-square w-[min(22rem,calc(100vw-5rem))] shrink-0">
          <img v-if="qrcodeDataUrl" class="flex items-center justify-center size-full" :src="qrcodeDataUrl">
          <span v-else class="flex items-center justify-center size-full">
            <div class="relative size-full flex items-center justify-center">
              <div class="bg-green-200 animate-ping size-32 absolute rounded-full"></div>
              <div class="size-32 bg-green-500 rounded-full text-white shadow z-10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="54" height="54" viewBox="0 0 256 256">
                  <path fill="currentColor" d="M240.49 15.51a12 12 0 0 0-17 0l-49.55 49.58l-2.54-2.55a36.05 36.05 0 0 0-50.91 0L100 83l-3.51-3.52a12 12 0 0 0-17 17L83 100l-20.46 20.49a36 36 0 0 0 0 50.91l2.55 2.54l-49.58 49.57a12 12 0 0 0 17 17l49.57-49.58l2.54 2.55a36.06 36.06 0 0 0 50.91 0L156 173l3.51 3.52a12 12 0 0 0 17-17L173 156l20.49-20.49a36 36 0 0 0 0-50.91l-2.55-2.54l49.58-49.57a12 12 0 0 0-.03-16.98m-121.95 161a12 12 0 0 1-17 0l-22.03-22.08a12 12 0 0 1 0-17L100 117l39 39Zm58-57.95L156 139l-39-39l20.49-20.49a12 12 0 0 1 17 0l22.06 22.06a12 12 0 0 1 0 17ZM85.27 33.37a12 12 0 0 1 21.46-10.74l8 16a12 12 0 1 1-21.46 10.74Zm-68 57.26a12 12 0 0 1 16.1-5.36l16 8a12 12 0 1 1-10.74 21.46l-16-8a12 12 0 0 1-5.36-16.1m221.46 74.74a12 12 0 0 1-16.1 5.36l-16-8a12 12 0 0 1 10.74-21.46l16 8a12 12 0 0 1 5.36 16.1m-68 57.26a12 12 0 1 1-21.46 10.74l-8-16a12 12 0 0 1 21.46-10.74Z" />
                </svg>
              </div>
            </div>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import QRCode from "qrcode";
import { ref, watch } from "vue";

const props = defineProps({ data: { type: String, default: "" } });

const qrcodeDataUrl = ref("");

const generateQrCode = () => {
  if (!props.data) {
    qrcodeDataUrl.value = "";
    return;
  }

  QRCode.toDataURL(props.data, (_, url) => {
    qrcodeDataUrl.value = url || ``;
  });
};

watch(
  () => props.data,
  () => {
    generateQrCode();
  },
  { immediate: true },
);
</script>
