<template>
  <div class="h-screen container mx-auto px-4 py-6 flex flex-col">
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
        <div class="flex items-center space-x-2 px-3 py-2 rounded-full glass-card">
          <div id="status-dot" class="w-3 h-3 rounded-full" :class="connected ? 'bg-green-400 glow' : 'bg-red-400 status-puls'"></div>
          <span id="status-label" class="text-sm font-medium">{{ connected ? "Connected" : "Reconnecting..." }}</span>
        </div>
      </div>
    </div>

    <!-- Body -->
    <div class="h-full grid grid-cols-12 gap-6 overflow-auto">
      <!-- Left Side - QR and Controls -->
      <div class="col-span-12 lg:col-span-7 space-y-4 overflow-auto">
        <!-- QR Code Section -->
        <QRCode :data="data.qrcode" />

        <div class="flex flex-col items-center lg:flex-row gap-3 w-full lg:w-fit">
          <button id="button-restart" class="w-full whitespace-nowrap btn-primary text-white px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50" :disabled="isLoadingAction" @click="restartSession">
            <i class="icon-[material-symbols--sync]"></i>
            Restart Session
          </button>
          <button id="button-logout" class="w-full whitespace-nowrap btn-secondary text-white px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50" :disabled="isLoadingAction" @click="logout">
            <i class="icon-[material-symbols--logout]"></i>
            Logout
          </button>
          <button id="button-test-send-message" class="w-full whitespace-nowrap btn-secondary text-white px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50" :disabled="isLoadingAction" @click="testSendMessage">
            <i class="icon-[material-symbols--send]"></i>
            Test Message
          </button>
        </div>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="metric-card rounded-xl p-4" :title="data.user.id">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                <i class="icon-[material-symbols--person] text-blue-400"></i>
              </div>
              <div>
                <p class="text-xs text-gray-400 uppercase">User ID</p>
                <p class="text-sm font-semibold line-clamp-1 break-all">{{ data.user.id || "-" }}</p>
              </div>
            </div>
          </div>

          <div class="metric-card rounded-xl p-4" :title="data.user.name">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                <i class="icon-[material-symbols--tag] text-purple-400"></i>
              </div>
              <div>
                <p class="text-xs text-gray-400 uppercase">Name</p>
                <p class="text-sm font-semibold line-clamp-1 break-all">{{ data.user.name || "-" }}</p>
              </div>
            </div>
          </div>

          <div class="metric-card rounded-xl p-4">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center shrink-0">
                <i class="icon-[material-symbols--signal-wifi-statusbar-not-connected] text-green-400"></i>
              </div>
              <div>
                <p class="text-xs text-gray-400 uppercase">State</p>
                <p class="text-sm font-semibold uppercase line-clamp-1 break-all">{{ data.state }} </p>
              </div>
            </div>
          </div>

          <div class="metric-card rounded-xl p-4">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center shrink-0">
                <i class="icon-[material-symbols--android-wifi-3-bar-rounded] text-orange-400"></i>
              </div>
              <div>
                <p class="text-xs text-gray-400 uppercase">Connection</p>
                <p class="text-sm font-semibold uppercase line-clamp-1 break-all">{{ data.connection }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Access Token -->
        <div class="glass-card rounded-xl p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-300">Access Token</span>
            <a :href="`${API_URL}/openapi`" target="_blank" class="text-xs text-blue-400 hover:text-blue-300">
              API Docs <i class="icon-[material-symbols--open-in-new] ml-1"></i>
            </a>
          </div>
          <div class="w-full flex gap-x-2">
            <div class="w-full bg-black/30 rounded-lg p-3 font-mono text-xs text-green-300 break-all">
              <span id="access-token">{{ ACCESS_TOKEN }}</span>
            </div>
            <button class="btn-secondary px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap" @click="copyToken">
              <i class="icon-[material-symbols--content-copy] mr-2"></i>Copy
            </button>
          </div>
        </div>
      </div>

      <!-- Right Side - Terminal -->
      <div class="col-span-12 lg:col-span-5 flex flex-col overflow-auto min-h-52">
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
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import QRCode from "./components/QRCode.vue";
import { ACCESS_TOKEN, API_URL } from "./utils/helper";

const EventSource = NativeEventSource || EventSourcePolyfill;
const connected = ref(false);
const isLoadingAction = ref(false);
const data = reactive({
  qrcode: "Hello World",
  user: {
    id: "",
    name: "",
    lid: "",
  },
  connection: null,
  state: "NOT_READY",
});
const logs = ref<{ timestamp: string; class: string; message: string }[]>([]);

// Methods
const addLog = (message: string, type: "error" | "info" | "success" | "default" = "default") => {
  const typeColors = {
    error: "text-red-400 border-red-400",
    info: "text-blue-400 border-blue-400",
    success: "text-green-400 border-green-400",
    default: "text-gray-300 border-gray-500",
  };
  logs.value.push({
    timestamp: new Date().toLocaleTimeString(),
    class: typeColors[type] || typeColors.default,
    message,
  });
  nextTick(() => {
    setTimeout(() => {
      const responseLogEl = document.getElementById("response-log");
      if (responseLogEl) {
        responseLogEl.scrollTop = responseLogEl.scrollHeight;
      }
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
  toast.innerHTML = `
    <i class="${icons[type]}"></i>
    <span class="text-white text-sm font-medium">${message}</span>
  `;

  toastContainer?.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
};
const copyToken = () => {
  const tokenText = ACCESS_TOKEN;
  navigator.clipboard.writeText(tokenText);
  showToast("Token copied to clipboard!", "success");
};
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
    console.info(event.data);
    const { state, user, connection, qr_code } = JSON.parse(event.data);
    data.state = state;
    data.user = user;
    data.connection = connection;
    data.qrcode = qr_code;
  };
};
const restartSession = async () => {
  addLog("Initiating session restart...", "info");
  isLoadingAction.value = true;
  try {
    const response = await axios.post(
      `${API_URL}/api/restart`,
      {},
      {
        headers: { ACCESS_TOKEN: ACCESS_TOKEN },
      },
    );
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
    const response = await axios.post(
      `${API_URL}/api/logout`,
      {},
      {
        headers: { ACCESS_TOKEN: ACCESS_TOKEN },
      },
    );
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
    const response = await axios.post(
      `${API_URL}/api/send-message`,
      {
        to: currentPhoneNumber,
        message: "Test Message from WhatsApp Gateway",
      },
      {
        headers: { ACCESS_TOKEN: ACCESS_TOKEN },
      },
    );
    addLog(response.data.message, "success");
  } catch (error: any) {
    const message = error.response?.data?.message || "Failed to send message";
    addLog(message, "error");
  } finally {
    isLoadingAction.value = false;
  }
};

onMounted(() => {
  nextTick(() => {
    startStream();
  });
});
onBeforeUnmount(() => {
  es.close();
});
</script>