<template>
  <div class="min-h-screen container mx-auto px-4 py-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
          <i class="icon-[material-symbols--smart-toy-rounded] text-white text-xl"></i>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-white">Bot Commands</h1>
          <p class="text-sm text-gray-300">Global WhatsApp group bot automation</p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <a href="/panel" class="btn-secondary px-4 py-2 rounded-xl text-sm font-medium">
          <i class="icon-[material-symbols--dashboard-rounded] mr-2"></i>Panel
        </a>
      </div>
    </div>

    <div class="grid grid-cols-12 gap-6">
      <div class="col-span-12 space-y-5">
        <div class="glass-card rounded-2xl p-5">
          <div class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="text-lg font-semibold">Admin Whitelist</h2>
              <p class="text-sm text-gray-400">Kosongkan untuk mengizinkan semua member group menjalankan command.</p>
            </div>
            <button class="btn-primary px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50" type="button" :disabled="isSavingSettings" @click="saveBotSettings">
              <i class="icon-[material-symbols--save-rounded] mr-2"></i>Save Whitelist
            </button>
          </div>
          <textarea
            v-model.trim="adminWhitelistInput"
            class="form-input min-h-28 resize-y font-mono"
            placeholder="6281234567890&#10;6289876543210@s.whatsapp.net"
            spellcheck="false"
          ></textarea>
        </div>

        <div class="glass-card rounded-2xl p-5">
          <div class="mb-4 flex items-center justify-between">
            <button class="btn-primary px-4 py-2 rounded-xl text-sm font-medium" type="button" @click="openCreateCommandModal">
              <i class="icon-[material-symbols--add-rounded] mr-2"></i>New Command
            </button>
            <span class="rounded-full bg-white/10 px-3 py-1 text-sm text-gray-300">{{ commands.length }} commands</span>
          </div>
          <div class="space-y-3">
            <div v-if="commands.length === 0" class="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-gray-400">
              No commands configured.
            </div>
            <div v-for="command in commands" :key="command.id" class="rounded-xl border border-white/10 bg-black/20 p-4">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-mono text-sm font-semibold text-emerald-300">{{ command.trigger }}</span>
                    <span class="rounded-full px-2 py-0.5 text-xs" :class="command.enabled ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'">{{ command.enabled ? "Enabled" : "Disabled" }}</span>
                    <span class="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-300">{{ command.type }}</span>
                  </div>
                  <p v-if="command.description" class="mt-1 text-sm text-gray-400">{{ command.description }}</p>
                  <p v-if="command.type === 'webhook'" class="mt-2 truncate font-mono text-xs text-blue-300">{{ command.webhookMethod }} {{ command.webhookUrl }}</p>
                  <p v-if="command.type === 'webhook' && command.webhookBody" class="mt-1 text-xs text-gray-400">Custom JSON body</p>
                  <p v-if="command.type === 'webhook' && !command.webhookReply" class="mt-1 text-xs text-yellow-300">No WhatsApp reply</p>
                  <p v-if="command.response" class="mt-2 line-clamp-2 whitespace-pre-line text-sm text-gray-200">{{ command.response }}</p>
                </div>
                <div class="flex shrink-0 gap-2">
                  <button class="btn-secondary size-9 rounded-lg" type="button" title="Edit" @click="openEditCommandModal(command)">
                    <i class="icon-[material-symbols--edit-rounded]"></i>
                  </button>
                  <button class="btn-secondary size-9 rounded-lg text-red-300" type="button" title="Delete" @click="deleteCommand(command.id)">
                    <i class="icon-[material-symbols--delete-rounded]"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CommandModal
      :model-value="showCommandModal"
      :command="editingCommand"
      :is-saving="isSavingCommand"
      @close="closeCommandModal"
      @save="saveCommand"
    />
  </div>
</template>

<script setup lang="ts">
import axios from "axios";
import { computed, onMounted, ref } from "vue";
import { ACCESS_TOKEN, API_URL } from "../../utils/helper";
import CommandModal from "./CommandModal.vue";
import type { GroupBotCommand, GroupBotCommandPayload } from "./types";

const props = defineProps<{
  addLog: (message: string, type?: "error" | "info" | "success" | "default") => void;
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}>();

const isLoadingCommands = ref(false);
const isSavingCommand = ref(false);
const isSavingSettings = ref(false);
const showCommandModal = ref(false);
const adminWhitelistInput = ref("");
const commands = ref<GroupBotCommand[]>([]);
const editingCommandId = ref("");
const editingCommand = computed(() => commands.value.find((command) => command.id === editingCommandId.value) || null);

const getErrorMessage = (error: any, fallback: string) => error.response?.data?.message || error.response?.data || fallback;
const parseAdminWhitelistInput = () => {
  return adminWhitelistInput.value
    .split(/\n|,/)
    .map((admin) => admin.trim())
    .filter(Boolean);
};
const loadCommands = async () => {
  isLoadingCommands.value = true;
  try {
    const response = await axios.get(`${API_URL}/api/group-bot/commands`, {
      headers: { ACCESS_TOKEN: ACCESS_TOKEN },
    });
    commands.value = response.data.commands || [];
  } catch (error: any) {
    const message = getErrorMessage(error, "Failed to load group bot commands");
    props.addLog(message, "error");
    props.showToast(message, "error");
  } finally {
    isLoadingCommands.value = false;
  }
};
const loadBotSettings = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/group-bot/settings`, {
      headers: { ACCESS_TOKEN: ACCESS_TOKEN },
    });
    adminWhitelistInput.value = (response.data.settings?.adminWhitelist || []).join("\n");
  } catch (error: any) {
    const message = getErrorMessage(error, "Failed to load group bot settings");
    props.addLog(message, "error");
    props.showToast(message, "error");
  }
};
const loadBotPageData = async () => {
  await Promise.all([loadCommands(), loadBotSettings()]);
};
const saveBotSettings = async () => {
  isSavingSettings.value = true;
  try {
    const response = await axios.put(
      `${API_URL}/api/group-bot/settings`,
      { adminWhitelist: parseAdminWhitelistInput() },
      {
        headers: { ACCESS_TOKEN: ACCESS_TOKEN },
      },
    );

    adminWhitelistInput.value = (response.data.settings?.adminWhitelist || []).join("\n");
    props.showToast(response.data.message, "success");
  } catch (error: any) {
    const message = getErrorMessage(error, "Failed to save group bot settings");
    props.addLog(message, "error");
    props.showToast(message, "error");
  } finally {
    isSavingSettings.value = false;
  }
};
const openCreateCommandModal = () => {
  editingCommandId.value = "";
  showCommandModal.value = true;
};
const openEditCommandModal = (command: GroupBotCommand) => {
  editingCommandId.value = command.id;
  showCommandModal.value = true;
};
const closeCommandModal = () => {
  showCommandModal.value = false;
  editingCommandId.value = "";
};
const saveCommand = async (payload: GroupBotCommandPayload) => {
  isSavingCommand.value = true;
  try {
    const url = editingCommandId.value ? `${API_URL}/api/group-bot/commands/${editingCommandId.value}` : `${API_URL}/api/group-bot/commands`;
    const response = editingCommandId.value ? await axios.put(url, payload, { headers: { ACCESS_TOKEN: ACCESS_TOKEN } }) : await axios.post(url, payload, { headers: { ACCESS_TOKEN: ACCESS_TOKEN } });

    props.addLog(response.data.message, "success");
    props.showToast(response.data.message, "success");
    closeCommandModal();
    await loadCommands();
  } catch (error: any) {
    const message = getErrorMessage(error, "Failed to save command");
    props.addLog(message, "error");
    props.showToast(message, "error");
  } finally {
    isSavingCommand.value = false;
  }
};
const deleteCommand = async (id: string) => {
  const command = commands.value.find((item) => item.id === id);
  const label = command?.trigger || "this command";
  if (!window.confirm(`Delete command ${label}?`)) return;

  isLoadingCommands.value = true;
  try {
    const response = await axios.delete(`${API_URL}/api/group-bot/commands/${id}`, {
      headers: { ACCESS_TOKEN: ACCESS_TOKEN },
    });
    props.addLog(response.data.message, "success");
    props.showToast(response.data.message, "success");
    if (editingCommandId.value === id) closeCommandModal();
    await loadCommands();
  } catch (error: any) {
    const message = getErrorMessage(error, "Failed to delete command");
    props.addLog(message, "error");
    props.showToast(message, "error");
  } finally {
    isLoadingCommands.value = false;
  }
};

onMounted(loadBotPageData);
</script>
