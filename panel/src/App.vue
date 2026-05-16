<template>
  <BotCommandsPage v-if="isBotCommandsPage" :add-log="addLog" :show-toast="showToast" />

  <div v-else class="h-screen container mx-auto px-4 py-6 flex flex-col">
    <!-- Header Bar -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-gradient-to-r from-green-400 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
          <i class="icon-[fa6-brands--whatsapp] text-white text-xl"></i>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-white">Gateway Panel</h1>
          <p class="text-sm text-gray-300">WhatsApp API Management</p>
        </div>
      </div>

      <div class="flex items-center space-x-4">
        <a href="/bot-commands" class="btn-secondary px-4 py-2 rounded-xl text-sm font-medium">
          <i class="icon-[material-symbols--smart-toy-rounded] mr-2"></i>Bot
        </a>
        <div class="flex items-center space-x-2 px-3 py-2 rounded-full glass-card">
          <div id="status-dot" class="w-3 h-3 rounded-full" :class="connected ? 'bg-green-400 glow' : 'bg-red-400 status-pulse'"></div>
          <span id="status-label" class="text-sm font-medium">{{ connected ? "Connected" : "Reconnecting..." }}</span>
        </div>
      </div>
    </div>

    <!-- Body -->
    <div class="h-full grid grid-cols-12 gap-6 overflow-auto">
      <!-- Left Side - QR and Controls -->
      <div class="col-span-12 lg:col-span-7 space-y-5 overflow-auto">
        <!-- Metrics Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div class="metric-card rounded-xl p-4 min-h-20" :title="data.user.id">
            <div class="flex items-center gap-3 min-w-0">
              <div class="size-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                <i class="icon-[material-symbols--person] text-blue-400"></i>
              </div>
              <div class="min-w-0">
                <p class="text-xs text-gray-400 uppercase">User ID</p>
                <p class="text-sm font-semibold truncate">{{ data.user.id || "-" }}</p>
              </div>
            </div>
          </div>

          <div class="metric-card rounded-xl p-4 min-h-20" :title="data.user.name">
            <div class="flex items-center gap-3 min-w-0">
              <div class="size-10 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                <i class="icon-[material-symbols--tag] text-purple-400"></i>
              </div>
              <div class="min-w-0">
                <p class="text-xs text-gray-400 uppercase">Name</p>
                <p class="text-sm font-semibold truncate">{{ data.user.name || "-" }}</p>
              </div>
            </div>
          </div>

          <div class="metric-card rounded-xl p-4 min-h-20">
            <div class="flex items-center gap-3 min-w-0">
              <div class="size-10 bg-green-500/20 rounded-lg flex items-center justify-center shrink-0">
                <i class="icon-[material-symbols--signal-wifi-statusbar-not-connected] text-green-400"></i>
              </div>
              <div class="min-w-0">
                <p class="text-xs text-gray-400 uppercase">State</p>
                <p class="text-sm font-semibold uppercase truncate">{{ data.state }} </p>
              </div>
            </div>
          </div>

          <div class="metric-card rounded-xl p-4 min-h-20">
            <div class="flex items-center gap-3 min-w-0">
              <div class="size-10 bg-orange-500/20 rounded-lg flex items-center justify-center shrink-0">
                <i class="icon-[material-symbols--android-wifi-3-bar-rounded] text-orange-400"></i>
              </div>
              <div class="min-w-0">
                <p class="text-xs text-gray-400 uppercase">Connection</p>
                <p class="text-sm font-semibold uppercase truncate">{{ data.connection || "-" }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Access Token -->
        <div class="glass-card rounded-xl p-4">
          <div class="flex items-center justify-between gap-3 mb-3">
            <span class="text-sm font-medium text-gray-300">Access Token</span>
            <a :href="`${API_URL}/openapi`" target="_blank" class="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap">
              API Docs <i class="icon-[material-symbols--open-in-new] ml-1"></i>
            </a>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3">
            <div class="min-w-0 overflow-x-auto bg-black/30 rounded-lg p-3 font-mono text-xs text-green-300 whitespace-nowrap">
              <span id="access-token">{{ ACCESS_TOKEN }}</span>
            </div>
            <button class="btn-secondary px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap" @click="copyToken">
              <i class="icon-[material-symbols--content-copy] mr-2"></i>Copy
            </button>
          </div>
        </div>

        <!-- Connection Section -->
        <div class="glass-card rounded-2xl p-5">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <i class="icon-[material-symbols--link] text-white"></i>
              </div>
              <div>
                <h2 class="text-lg font-semibold">Connection</h2>
                <p class="text-sm text-gray-400">{{ isSessionReady ? "WhatsApp session is active" : "Choose how to connect WhatsApp" }}</p>
              </div>
            </div>

            <div v-if="!isSessionReady" class="grid grid-cols-2 gap-1 rounded-xl bg-black/25 p-1">
              <button
                class="rounded-lg px-4 py-2 text-sm font-medium transition"
                :class="activeConnectionTab === 'qr' ? 'bg-white/15 text-white shadow' : 'text-gray-400 hover:text-white'"
                type="button"
                @click="activeConnectionTab = 'qr'"
              >
                <i class="icon-[material-symbols--qr-code] mr-2"></i>QR
              </button>
              <button
                class="rounded-lg px-4 py-2 text-sm font-medium transition"
                :class="activeConnectionTab === 'pairing' ? 'bg-white/15 text-white shadow' : 'text-gray-400 hover:text-white'"
                type="button"
                @click="activeConnectionTab = 'pairing'"
              >
                <i class="icon-[material-symbols--password] mr-2"></i>Pair Code
              </button>
            </div>
          </div>

          <div v-if="isSessionReady" class="rounded-2xl border border-green-400/20 bg-green-500/10 p-6">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-center gap-4">
                <div class="size-14 rounded-2xl bg-green-500/20 text-green-300 flex items-center justify-center">
                  <i class="icon-[material-symbols--check-circle-rounded] text-3xl"></i>
                </div>
                <div>
                  <p class="text-xl font-semibold text-white">Session Connected</p>
                  <p class="text-sm text-gray-300">{{ data.user.name || data.user.id || "WhatsApp account is ready" }}</p>
                </div>
              </div>
              <div class="rounded-full bg-green-500/20 px-3 py-1 text-sm font-medium text-green-300">
                {{ data.state }}
              </div>
            </div>
          </div>

          <div v-else>
            <div v-show="activeConnectionTab === 'qr'">
              <QRCode :data="data.qrcode" />
            </div>

            <div v-show="activeConnectionTab === 'pairing'" class="space-y-4">
              <div class="rounded-xl bg-black/20 p-4">
                <div class="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-medium text-white">Pairing Code</p>
                    <p class="text-xs text-gray-400">Enter WhatsApp phone number with country code.</p>
                  </div>
                  <div class="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-sm">
                    Phone Number
                  </div>
                </div>

                <form class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3" @submit.prevent="requestPairingCode">
                  <input
                    v-model.trim="pairingPhoneNumber"
                    class="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-emerald-400"
                    inputmode="tel"
                    autocomplete="tel"
                    placeholder="6281234567890"
                    :disabled="isLoadingPairing || isSessionReady"
                  >
                  <button class="btn-primary text-white px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50" :disabled="isLoadingPairing || isSessionReady || !pairingPhoneNumber">
                    <i class="icon-[material-symbols--password]"></i>
                    Get Code
                  </button>
                </form>
              </div>

              <div v-if="data.pairing.code" class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                <div class="bg-black/30 rounded-xl px-4 py-3">
                  <p class="text-xs text-gray-400 uppercase">Code for {{ data.pairing.phone_number }}</p>
                  <p class="font-mono text-2xl font-bold tracking-widest text-emerald-300">{{ formatPairingCode(data.pairing.code) }}</p>
                </div>
                <button class="btn-secondary px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap" @click="copyPairingCode">
                  <i class="icon-[material-symbols--content-copy] mr-2"></i>Copy Code
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Right Side - Terminal -->
      <div class="col-span-12 lg:col-span-5 flex flex-col gap-3 overflow-auto min-h-52">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button id="button-restart" class="w-full whitespace-nowrap btn-primary text-white px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50" :class="!isSessionReady ? 'col-span-full' : ''" :disabled="isLoadingAction" @click="restartSession">
            <i class="icon-[material-symbols--sync]"></i>
            Restart Session
          </button>
          <template v-if="isSessionReady">
            <button id="button-logout" class="w-full whitespace-nowrap btn-secondary text-white px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50" :disabled="isLoadingAction" @click="logout">
              <i class="icon-[material-symbols--logout]"></i>
              Logout
            </button>
            <button id="button-test-send-message" class="w-full whitespace-nowrap btn-secondary text-white px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50" :disabled="isLoadingAction" @click="testSendMessage">
              <i class="icon-[material-symbols--send]"></i>
              Test Message
            </button>
          </template>
        </div>
        <div class="terminal rounded-2xl h-full flex flex-col">
          <div class="flex items-center justify-between p-4 border-b border-slate-700">
            <div class="flex items-center space-x-3">
              <div class="flex space-x-2">
                <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div class="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <span class="text-sm font-medium text-gray-300">System Monitor</span>
            </div>
            <button class="text-gray-500 hover:text-red-400 transition text-sm" @click="clearLog">
              <i class="icon-[material-symbols--delete] mr-1"></i>Clear
            </button>
          </div>
          <div id="response-log" class="grow overflow-auto">
            <div class="text-green-400 text-xs space-y-1 overflow-y-auto">
              <div v-for="log in logs" class="log-entry" :class="log.class">
                <span class="text-gray-500">[{{ log.timestamp }}]</span> {{ log.message }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from "axios";
import { EventSourcePolyfill, NativeEventSource } from "event-source-polyfill";
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import BotCommandsPage from "./components/bot/BotCommandsPage.vue";
import QRCode from "./components/QRCode.vue";
import { ACCESS_TOKEN, API_URL } from "./utils/helper";

const EventSource = NativeEventSource || EventSourcePolyfill;
const isBotCommandsPage = computed(() => window.location.pathname === "/bot-commands");
const connected = ref(false);
const isLoadingAction = ref(false);
const isLoadingPairing = ref(false);
const pairingPhoneNumber = ref("");
const activeConnectionTab = ref<"qr" | "pairing">("qr");
const data = reactive({
  qrcode: "",
  user: { id: "", name: "", lid: "" },
  connection: null,
  state: "NOT_READY",
  pairing: { code: "", phone_number: "", requested_at: null as number | null },
});
const logs = ref<{ timestamp: string; class: string; message: string }[]>([]);
const isSessionReady = computed(() => {
  const connection = String(data.connection || "").toLowerCase();
  return data.state === "READY" || connection === "open" || connection === "connected";
});

const addLog = (message: string, type: "error" | "info" | "success" | "default" = "default") => {
  const typeColors = {
    error: "text-red-400 border-red-400",
    info: "text-blue-400 border-blue-400",
    success: "text-green-400 border-green-400",
    default: "text-gray-300 border-gray-500",
  };
  logs.value.push({ timestamp: new Date().toLocaleTimeString(), class: typeColors[type] || typeColors.default, message });
  nextTick(() => {
    setTimeout(() => {
      const responseLogEl = document.getElementById("response-log");
      if (responseLogEl) responseLogEl.scrollTop = responseLogEl.scrollHeight;
    }, 100);
  });
};
function clearLog() {
  logs.value = [];
  addLog("System log cleared", "info");
}

const showToast = (message: string, type: "success" | "error" | "info" | "warning" = "info") => {
  const toastContainer = document.getElementById("toast-container");
  const icons = {
    success: "icon-[material-symbols--check-circle-rounded] text-green-400",
    error: "icon-[material-symbols--exclamation-rounded] text-red-400",
    info: "icon-[material-symbols--info-rounded] text-blue-400",
    warning: "icon-[material-symbols--warning-rounded] text-yellow-400",
  };
  const toast = document.createElement("div");
  toast.className = "notification glass-card px-4 py-3 rounded-lg flex items-center space-x-3 min-w-80";
  toast.innerHTML = `<i class="${icons[type]}"></i><span class="text-white text-sm font-medium">${message}</span>`;
  toastContainer?.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
};
const copyToken = () => {
  navigator.clipboard.writeText(ACCESS_TOKEN);
  showToast("Token copied to clipboard!", "success");
};
const copyPairingCode = () => {
  navigator.clipboard.writeText(data.pairing.code);
  showToast("Pairing code copied to clipboard!", "success");
};
const formatPairingCode = (code: string) => code.replace(/(.{4})/g, "$1 ").trim();

const es = new EventSource(`${API_URL}/sse?token=${ACCESS_TOKEN}`);
const startStream = () => {
  addLog(`Connecting to ${API_URL}/sse`, "info");
  es.onopen = () => {
    addLog("Stream connection established", "success");
    connected.value = true;
  };
  es.onerror = () => {
    addLog("Connection lost. Attempting to reconnect...", "error");
    connected.value = false;
  };
  es.onmessage = (event) => {
    const { state, user, connection, qr_code, pairing } = JSON.parse(event.data);
    data.state = state;
    data.user = user;
    data.connection = connection;
    data.qrcode = qr_code;
    data.pairing = pairing || { code: "", phone_number: "", requested_at: null };
  };
};
const requestPairingCode = async () => {
  addLog(`Requesting pairing code for ${pairingPhoneNumber.value}...`, "info");
  isLoadingPairing.value = true;
  try {
    const response = await axios.post(`${API_URL}/api/pairing-code`, { phone_number: pairingPhoneNumber.value }, { headers: { ACCESS_TOKEN: ACCESS_TOKEN } });
    data.pairing.code = response.data.pairing_code;
    data.pairing.phone_number = response.data.phone_number;
    data.pairing.requested_at = Date.now();
    addLog(response.data.message, "success");
    showToast("Pairing code generated", "success");
  } catch (error: any) {
    const message = error.response?.data?.message || error.response?.data || "Failed to request pairing code";
    addLog(message, "error");
    showToast(message, "error");
  } finally {
    isLoadingPairing.value = false;
  }
};
const restartSession = async () => {
  addLog("Initiating session restart...", "info");
  isLoadingAction.value = true;
  try {
    const response = await axios.post(`${API_URL}/api/restart`, {}, { headers: { ACCESS_TOKEN: ACCESS_TOKEN } });
    addLog(response.data.message, "success");
  } catch (error: any) {
    const message = error.response?.data?.message || "Restart failed";
    addLog(message, "error");
  } finally {
    isLoadingAction.value = false;
  }
};
const logout = async () => {
  addLog("Logging out...", "info");
  isLoadingAction.value = true;
  try {
    const response = await axios.post(`${API_URL}/api/logout`, {}, { headers: { ACCESS_TOKEN: ACCESS_TOKEN } });
    addLog(response.data.message, "success");
  } catch (error: any) {
    const message = error.response?.data?.message || "Logout failed";
    addLog(message, "error");
  } finally {
    isLoadingAction.value = false;
  }
};
const testSendMessage = async () => {
  const currentPhoneNumber = data.user?.id?.split(":")[0];
  if (!currentPhoneNumber || currentPhoneNumber === "-") {
    addLog("No active session found. Please scan QR code first", "error");
    return;
  }
  addLog(`Sending test message to ${currentPhoneNumber}...`, "info");
  isLoadingAction.value = true;
  try {
    const response = await axios.post(`${API_URL}/api/send-message`, { to: currentPhoneNumber, message: "Test Message from WhatsApp Gateway" }, { headers: { ACCESS_TOKEN: ACCESS_TOKEN } });
    addLog(response.data.message, "success");
  } catch (error: any) {
    const message = error.response?.data?.message || "Failed to send message";
    addLog(message, "error");
  } finally {
    isLoadingAction.value = false;
  }
};

onMounted(() => {
  nextTick(() => startStream());
});
onBeforeUnmount(() => {
  es.close();
});
</script>
