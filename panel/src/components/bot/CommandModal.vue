<template>
  <div v-if="modelValue" class="modal-backdrop fixed inset-0 flex items-center justify-center px-4 py-6">
    <div class="modal-panel max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl p-5">
      <div class="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">{{ command ? "Edit Command" : "New Command" }}</h2>
          <p class="text-sm text-gray-400">Command berlaku global untuk semua group yang diikuti bot.</p>
        </div>
        <button class="btn-secondary size-9 rounded-lg" type="button" title="Close" @click="close">
          <i class="icon-[material-symbols--close-rounded]"></i>
        </button>
      </div>

      <form class="space-y-3" @submit.prevent="submit">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input v-model.trim="form.trigger" class="form-input" placeholder="/report2 {date}" maxlength="64" required>
          <select v-model="form.type" class="form-input">
            <option value="text">Text reply</option>
            <option value="webhook">HTTP</option>
          </select>
        </div>
        <input v-model.trim="form.description" class="form-input" placeholder="Description optional" maxlength="160">

        <div class="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <span class="text-xs text-gray-400">Variables</span>
          <button v-for="variable in commandVariables" :key="variable" class="rounded-lg bg-white/10 px-2 py-1 font-mono text-xs text-emerald-300 hover:bg-white/20" type="button" @click="insertVariable(variable)">
            {{ variable }}
          </button>
        </div>

        <div v-if="form.type === 'webhook'" class="space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-3">
            <select v-model="form.webhookMethod" class="form-input">
              <option value="POST">POST JSON</option>
              <option value="GET">GET Query</option>
            </select>
            <input v-model.trim="form.webhookUrl" class="form-input" placeholder="https://n8n.example.com/webhook/whatsapp-command">
          </div>

          <div v-if="form.webhookMethod === 'POST'" class="rounded-xl border border-white/10 bg-black/30">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
              <div class="flex items-center gap-2 text-xs" :class="jsonBodyError ? 'text-red-300' : 'text-emerald-300'">
                <i :class="jsonBodyError ? 'icon-[material-symbols--error-rounded]' : 'icon-[material-symbols--check-circle-rounded]'"></i>
                <span>{{ jsonBodyError || "Valid JSON body" }}</span>
              </div>
              <div class="flex gap-2">
                <button class="btn-secondary rounded-lg px-3 py-1.5 text-xs" type="button" title="Format JSON (Ctrl/Cmd+Shift+F)" @click="formatWebhookBody">
                  <i class="icon-[material-symbols--format-align-left-rounded] mr-1"></i>Format
                </button>
                <button class="btn-secondary rounded-lg px-3 py-1.5 text-xs" type="button" title="Minify JSON (Ctrl/Cmd+Shift+M)" @click="minifyWebhookBody">
                  <i class="icon-[material-symbols--compress-rounded] mr-1"></i>Minify
                </button>
              </div>
            </div>
            <div class="json-editor">
              <pre class="json-lines">{{ webhookBodyLineNumbers }}</pre>
              <textarea
                v-model="form.webhookBody"
                class="json-code"
                placeholder='{"date":"{param_1}","message":"{text}","sender":"{sender}"}'
                maxlength="8000"
                spellcheck="false"
                @focus="setActiveTemplateTarget('body')"
                @beforeinput="recordJsonUndoSnapshot"
                @input="updateVariableAutocomplete(form.webhookBody)"
                @keydown="handleJsonEditorKeydown"
              ></textarea>
            </div>
          </div>

          <div v-else class="rounded-xl border border-white/10 bg-black/30">
            <div class="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
              <span class="text-xs text-gray-300">Query Params</span>
              <button class="btn-secondary rounded-lg px-3 py-1.5 text-xs" type="button" @click="addWebhookQueryParam">
                <i class="icon-[material-symbols--add-rounded] mr-1"></i>Add
              </button>
            </div>
            <div class="space-y-2 p-3">
              <div v-for="(param, index) in form.webhookQuery" :key="param.id" class="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
                <input v-model="param.enabled" type="checkbox" class="mt-3 accent-emerald-500">
                <input
                  v-model.trim="param.key"
                  class="form-input"
                  placeholder="date"
                  @focus="setActiveTemplateTarget('query', index, 'key')"
                  @input="updateVariableAutocomplete(param.key)"
                  @keydown="handleTemplateEditorKeydown($event, 'query', index, 'key')"
                >
                <input
                  v-model.trim="param.value"
                  class="form-input"
                  placeholder="{date}"
                  @focus="setActiveTemplateTarget('query', index, 'value')"
                  @input="updateVariableAutocomplete(param.value)"
                  @keydown="handleTemplateEditorKeydown($event, 'query', index, 'value')"
                >
                <button class="btn-secondary size-10 rounded-lg text-red-300" type="button" title="Remove" @click="removeWebhookQueryParam(index)">
                  <i class="icon-[material-symbols--remove-rounded]"></i>
                </button>
              </div>
              <div v-if="form.webhookQuery.length === 0" class="flex items-center justify-center w-full">
                <span class="text-sm text-gray-500">No queries</span>
              </div>
            </div>
          </div>

          <label class="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-gray-300">
            <input v-model="form.webhookReply" type="checkbox" class="accent-emerald-500">
            Reply WhatsApp with webhook response or fallback
          </label>
        </div>

        <div v-show="showResponseInput" class="relative">
          <textarea
            v-model="form.response"
            class="form-input min-h-32 resize-y"
            :placeholder="form.type === 'webhook' ? 'Fallback reply if webhook returns empty text. Variables: {text}, {sender}, {param_1}, {param_text}' : 'Reply text. Variables: {text}, {sender}, {group_name}, {param_1}, {param_text}'"
            maxlength="4000"
            :required="form.type === 'text'"
            :disabled="form.type === 'webhook' && !form.webhookReply"
            @focus="setActiveTemplateTarget('response')"
            @input="updateVariableAutocomplete(form.response)"
            @keydown="handleTemplateEditorKeydown($event, 'response')"
          ></textarea>
          <div v-if="showVariableAutocomplete && activeTemplateTarget.type === 'response'" class="variable-menu">
            <button v-for="variable in filteredCommandVariables" :key="variable" class="variable-menu-item" type="button" @mousedown.prevent="insertVariable(variable)">
              {{ variable }}
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-wrap gap-4 text-sm text-gray-300">
            <label class="flex items-center gap-2">
              <input v-model="form.enabled" type="checkbox" class="accent-emerald-500">
              Enabled
            </label>
            <label class="flex items-center gap-2">
              <input v-model="form.exactMatch" type="checkbox" class="accent-emerald-500">
              Exact match
            </label>
          </div>
          <div class="flex gap-2">
            <button class="btn-secondary px-4 py-2 rounded-xl text-sm font-medium" type="button" @click="close">Cancel</button>
            <button class="btn-primary px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50" type="submit" :disabled="isSaving || !canSave">
              <i class="icon-[material-symbols--save-rounded] mr-2"></i>{{ command ? "Update" : "Create" }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch, onBeforeUnmount, onMounted } from "vue";
import type { GroupBotCommand, GroupBotCommandPayload, WebhookQueryParam } from "./types";

type TemplateTarget = { type: "body" } | { type: "response" } | { type: "query"; index: number; field: "key" | "value" };

const props = defineProps<{
  modelValue: boolean;
  command: GroupBotCommand | null;
  isSaving: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [payload: GroupBotCommandPayload];
}>();

const activeTemplateTarget = ref<TemplateTarget>({ type: "body" });
const jsonUndoStack = ref<string[]>([]);
const jsonRedoStack = ref<string[]>([]);
const showVariableAutocomplete = ref(false);
const variableAutocompleteQuery = ref("");
const form = reactive<GroupBotCommandPayload>({
  trigger: "",
  type: "text",
  response: "",
  description: "",
  webhookUrl: "",
  webhookMethod: "POST",
  webhookBody: "",
  webhookQuery: [],
  webhookReply: true,
  enabled: true,
  exactMatch: false,
});

const canSave = computed(() => {
  if (!form.trigger) return false;
  if (form.type === "text") return Boolean(form.response);
  return Boolean(form.webhookUrl) && !jsonBodyError.value;
});
const jsonBodyError = computed(() => {
  if (form.type !== "webhook" || form.webhookMethod !== "POST") return "";
  const body = form.webhookBody.trim();
  if (!body) return "";

  try {
    JSON.parse(body);
    return "";
  } catch (error: any) {
    return error?.message || "Invalid JSON";
  }
});
const webhookBodyLineNumbers = computed(() => {
  const lines = Math.max(form.webhookBody.split("\n").length, 6);
  return Array.from({ length: lines }, (_, index) => index + 1).join("\n");
});
const commandParamNames = computed(() => {
  return Array.from(form.trigger.matchAll(/\{([a-z][a-z0-9_]*)\}/gi), (match) => match[1]).filter((name): name is string => Boolean(name));
});
const commandVariables = computed(() => {
  const defaults = ["{text}", "{sender}", "{param_1}", "{param_text}", "{params}", "{group_name}", "{group_id}", "{participant_count}", "{admin_count}", "{description}", "{owner}", "{created_at}"];
  const named = commandParamNames.value.map((name) => `{${name}}`);
  return Array.from(new Set([...named, ...defaults]));
});
const filteredCommandVariables = computed(() => {
  const query = variableAutocompleteQuery.value.toLowerCase();
  if (!query) return commandVariables.value;
  return commandVariables.value.filter((variable) => variable.toLowerCase().includes(query));
});
const showResponseInput = computed(() => {
  if(form.type === "text") return true;
  return !!form.webhookReply;
})

const createLocalId = () => `row_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const resetJsonHistory = () => {
  jsonUndoStack.value = [];
  jsonRedoStack.value = [];
};
const resetForm = () => {
  Object.assign(form, {
    trigger: "",
    type: "text",
    response: "",
    description: "",
    webhookUrl: "",
    webhookMethod: "POST",
    webhookBody: "",
    webhookQuery: [],
    webhookReply: false,
    enabled: true,
    exactMatch: false,
  } satisfies GroupBotCommandPayload);
  activeTemplateTarget.value = { type: "body" };
  showVariableAutocomplete.value = false;
  resetJsonHistory();
};
const loadCommand = (command: GroupBotCommand | null) => {
  if (!command) {
    resetForm();
    return;
  }

  Object.assign(form, {
    trigger: command.trigger,
    type: command.type || "text",
    response: command.response || "",
    description: command.description || "",
    webhookUrl: command.webhookUrl || "",
    webhookMethod: command.webhookMethod || "POST",
    webhookBody: command.webhookBody || "",
    webhookQuery: (command.webhookQuery || []).map((param) => ({ ...param, id: createLocalId() })),
    webhookReply: command.webhookReply ?? true,
    enabled: command.enabled,
    exactMatch: command.exactMatch,
  } satisfies GroupBotCommandPayload);
  resetJsonHistory();
};
const close = () => {
  emit("close");
};
const submit = () => {
  if (jsonBodyError.value) return;
  emit("save", {
    ...form,
    webhookQuery: form.webhookQuery.map(({ key, value, enabled }) => ({ key, value, enabled })),
  });
};
const addWebhookQueryParam = () => {
  form.webhookQuery.push({ id: createLocalId(), key: "", value: "", enabled: true });
};
const removeWebhookQueryParam = (index: number) => {
  form.webhookQuery.splice(index, 1);
};
const setActiveTemplateTarget = (type: "body" | "response" | "query", index?: number, field?: "key" | "value") => {
  if (type === "body") activeTemplateTarget.value = { type: "body" };
  else if (type === "response") activeTemplateTarget.value = { type: "response" };
  else activeTemplateTarget.value = { type: "query", index: index || 0, field: field || "value" };
};
const updateVariableAutocomplete = (value: string) => {
  const match = value.match(/\{([a-z0-9_]*)$/i);
  showVariableAutocomplete.value = Boolean(match);
  variableAutocompleteQuery.value = match?.[1] || "";
};
const insertVariable = (variable: string) => {
  const target = activeTemplateTarget.value;
  if (target.type === "query") {
    const row = form.webhookQuery[target.index];
    if (row) row[target.field] = `${row[target.field] || ""}${variable}`;
  } else if (target.type === "response") {
    form.response = `${form.response || ""}${variable}`;
  } else {
    recordJsonUndoSnapshot();
    form.webhookBody = `${form.webhookBody || ""}${variable}`;
  }
  showVariableAutocomplete.value = false;
};
const replaceTrailingVariableQuery = (value: string, variable: string) => value.replace(/\{[a-z0-9_]*$/i, variable);
const applyAutocompleteVariable = (variable: string) => {
  const target = activeTemplateTarget.value;
  if (target.type === "query") {
    const row = form.webhookQuery[target.index];
    if (row) row[target.field] = replaceTrailingVariableQuery(row[target.field] || "", variable);
  } else if (target.type === "response") {
    form.response = replaceTrailingVariableQuery(form.response || "", variable);
  } else {
    recordJsonUndoSnapshot();
    form.webhookBody = replaceTrailingVariableQuery(form.webhookBody || "", variable);
  }
  showVariableAutocomplete.value = false;
};
const handleTemplateEditorKeydown = (event: KeyboardEvent, type: "response" | "query", index?: number, field?: "key" | "value") => {
  setActiveTemplateTarget(type, index, field);

  if ((event.ctrlKey || event.metaKey) && event.key === " ") {
    event.preventDefault();
    showVariableAutocomplete.value = true;
    variableAutocompleteQuery.value = "";
    return;
  }
  if (!showVariableAutocomplete.value) return;
  if (event.key === "Escape") {
    event.preventDefault();
    showVariableAutocomplete.value = false;
    return;
  }
  if (event.key !== "Enter" && event.key !== "Tab") return;

  const variable = filteredCommandVariables.value[0];
  if (!variable) return;
  event.preventDefault();
  applyAutocompleteVariable(variable);
};
const recordJsonUndoSnapshot = () => {
  const current = form.webhookBody;
  if (jsonUndoStack.value.at(-1) === current) return;

  jsonUndoStack.value.push(current);
  if (jsonUndoStack.value.length > 100) jsonUndoStack.value.shift();
  jsonRedoStack.value = [];
};
const restoreJsonBody = (textarea: HTMLTextAreaElement, value: string) => {
  form.webhookBody = value;
  nextTick(() => {
    const position = Math.min(value.length, textarea.selectionStart);
    textarea.selectionStart = position;
    textarea.selectionEnd = position;
  });
};
const undoJsonBody = (textarea: HTMLTextAreaElement) => {
  const previous = jsonUndoStack.value.pop();
  if (previous === undefined) return;
  jsonRedoStack.value.push(form.webhookBody);
  restoreJsonBody(textarea, previous);
};
const redoJsonBody = (textarea: HTMLTextAreaElement) => {
  const next = jsonRedoStack.value.pop();
  if (next === undefined) return;
  jsonUndoStack.value.push(form.webhookBody);
  restoreJsonBody(textarea, next);
};
const updateWebhookBodySelection = (textarea: HTMLTextAreaElement, nextValue: string, nextStart: number, nextEnd = nextStart) => {
  recordJsonUndoSnapshot();
  form.webhookBody = nextValue;
  nextTick(() => {
    textarea.selectionStart = nextStart;
    textarea.selectionEnd = nextEnd;
  });
};
const formatWebhookBody = () => {
  const body = form.webhookBody.trim();
  if (!body) return;
  recordJsonUndoSnapshot();
  form.webhookBody = JSON.stringify(JSON.parse(body), null, 2);
};
const minifyWebhookBody = () => {
  const body = form.webhookBody.trim();
  if (!body) return;
  recordJsonUndoSnapshot();
  form.webhookBody = JSON.stringify(JSON.parse(body));
};
const getSelectedLineRange = (value: string, start: number, end: number) => {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEndIndex = value.indexOf("\n", end);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
  return { lineStart, lineEnd };
};
const indentJsonSelection = (textarea: HTMLTextAreaElement) => {
  const value = form.webhookBody;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const { lineStart, lineEnd } = getSelectedLineRange(value, start, end);
  const selected = value.slice(lineStart, lineEnd);
  const indented = selected
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
  updateWebhookBodySelection(textarea, `${value.slice(0, lineStart)}${indented}${value.slice(lineEnd)}`, start + 2, end + 2 * selected.split("\n").length);
};
const outdentJsonSelection = (textarea: HTMLTextAreaElement) => {
  const value = form.webhookBody;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const { lineStart, lineEnd } = getSelectedLineRange(value, start, end);
  const before = value.slice(0, lineStart);
  const selected = value.slice(lineStart, lineEnd);
  const after = value.slice(lineEnd);
  let removedBeforeStart = 0;
  let removedBeforeEnd = 0;
  let cursor = lineStart;
  const outdented = selected
    .split("\n")
    .map((line) => {
      const removed = line.startsWith("  ") ? 2 : line.startsWith(" ") ? 1 : 0;
      if (cursor < start) removedBeforeStart += Math.min(removed, start - cursor);
      if (cursor < end) removedBeforeEnd += Math.min(removed, end - cursor);
      cursor += line.length + 1;
      return line.slice(removed);
    })
    .join("\n");
  updateWebhookBodySelection(textarea, `${before}${outdented}${after}`, Math.max(lineStart, start - removedBeforeStart), Math.max(lineStart, end - removedBeforeEnd));
};
const handleJsonEditorKeydown = (event: KeyboardEvent) => {
  const textarea = event.target as HTMLTextAreaElement;
  const isModifier = event.metaKey || event.ctrlKey;

  if (isModifier && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) redoJsonBody(textarea);
    else undoJsonBody(textarea);
    return;
  }
  if (isModifier && event.key.toLowerCase() === "y") {
    event.preventDefault();
    redoJsonBody(textarea);
    return;
  }
  if (isModifier && event.key === "]") {
    event.preventDefault();
    indentJsonSelection(textarea);
    return;
  }
  if (isModifier && event.key === "[") {
    event.preventDefault();
    outdentJsonSelection(textarea);
    return;
  }
  if (isModifier && event.key === " ") {
    event.preventDefault();
    showVariableAutocomplete.value = true;
    variableAutocompleteQuery.value = "";
    return;
  }
  if (showVariableAutocomplete.value && (event.key === "Enter" || event.key === "Tab")) {
    const variable = filteredCommandVariables.value[0];
    if (variable) {
      event.preventDefault();
      applyAutocompleteVariable(variable);
      return;
    }
  }
  if (isModifier && event.shiftKey && event.key.toLowerCase() === "f") {
    event.preventDefault();
    formatWebhookBody();
    return;
  }
  if (isModifier && event.shiftKey && event.key.toLowerCase() === "m") {
    event.preventDefault();
    minifyWebhookBody();
    return;
  }
  if (event.key !== "Tab") return;

  event.preventDefault();
  if (event.shiftKey) {
    outdentJsonSelection(textarea);
    return;
  }
  if (textarea.selectionStart !== textarea.selectionEnd) {
    indentJsonSelection(textarea);
    return;
  }
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = form.webhookBody;
  updateWebhookBodySelection(textarea, `${value.slice(0, start)}  ${value.slice(end)}`, start + 2);
};
const handleModalShortcut = (event: KeyboardEvent) => {
  if (!props.modelValue || event.defaultPrevented) return;
  if (event.key === "Escape") {
    event.preventDefault();
    close();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    if (canSave.value && !props.isSaving) submit();
  }
};

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) loadCommand(props.command);
  },
  { immediate: true },
);
watch(
  () => props.command,
  (command) => {
    if (props.modelValue) loadCommand(command);
  },
);
onMounted(() => window.addEventListener("keydown", handleModalShortcut));
onBeforeUnmount(() => window.removeEventListener("keydown", handleModalShortcut));
</script>
