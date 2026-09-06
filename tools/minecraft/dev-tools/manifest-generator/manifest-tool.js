const CAPABILITIES = [
    { id: "chemistry", label: "Chemistry", desc: "Enables chemistry-related blocks and behavior." },
    { id: "editorExtension", label: "Editor Extension", desc: "Marks the pack as an extension for the Minecraft Editor." },
    { id: "experimental_custom_ui", label: "Experimental Custom UI", desc: "Lets the pack build custom UI using HTML/JS." },
    { id: "raytraced", label: "Raytraced", desc: "Enables ray-traced PBR rendering on supported devices." },
    { id: "pbr", label: "PBR (Vibrant Visuals)", desc: "Optimizes the pack for full Vibrant Visuals PBR support." }
];

const MODULE_TYPES = ["resources", "data", "script", "skin_pack", "world_template"];
const KNOWN_ROOT_KEYS = ["format_version", "header", "modules", "dependencies", "capabilities", "metadata", "settings", "subpacks", "has_education_metadata"];
const KNOWN_HEADER_KEYS = ["name", "description", "uuid", "version", "min_engine_version", "base_game_version", "pack_scope", "platform_locked", "allow_random_seed", "lock_template_options", "pack_optimization_version"];

const GENERATOR_TOOL_NAME = "nako_manifest_tool";
const GENERATOR_TOOL_VERSION = "3.0.0";

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function cryptoUUID() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function zeroVer() { return { major: 0, minor: 0, patch: 0 }; }

function parseVersion(raw) {
    if (Array.isArray(raw)) {
        return {
            major: parseInt(raw[0], 10) || 0,
            minor: parseInt(raw[1], 10) || 0,
            patch: parseInt(raw[2], 10) || 0
        };
    }
    if (typeof raw === "string") {
        const parts = raw.split(".").map(p => parseInt(p, 10) || 0);
        return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
    }
    return zeroVer();
}

function verString(v) {
    return `${v.major || 0}.${v.minor || 0}.${v.patch || 0}`;
}

function verOutput(v, fmt) {
    return fmt === 3 ? verString(v) : [v.major || 0, v.minor || 0, v.patch || 0];
}

function defaultState() {
    return {
        formatVersion: 3,
        packKind: "resources",
        header: {
            rawName: "My Pack",
            description: "Description of my pack :D",
            uuid: cryptoUUID(),
            version: { major: 1, minor: 0, patch: 0 },
            min_engine_version: { major: 1, minor: 21, patch: 130 },
            base_game_version: zeroVer(),
            base_game_version_enabled: false,
            pack_scope: "any",
            pack_scope_enabled: false,
            platform_locked: false,
            platform_locked_enabled: false,
            allow_random_seed: false,
            allow_random_seed_enabled: false,
            lock_template_options: false,
            lock_template_options_enabled: false,
            pack_optimization_version: ""
        },
        modules: [
            { id: uid(), type: "resources", uuid: cryptoUUID(), version: { major: 1, minor: 0, patch: 0 }, language: "javascript", entry: "scripts/main.js", description: "" }
        ],
        dependencies: [],
        capabilities: [],
        metadata: {
            authors: [""],
            license: "",
            url: "",
            product_type: "",
            generated_with: null,
            stampGenerator: false
        },
        settings: [],
        subpacks: [],
        educationMetadata: false,
        unknownRoot: {},
        unknownHeader: {},
        importedFormatVersion: null
    };
}

let state = defaultState();

// Strip a trailing legacy " V n, n, n" tail that older versions of this tool
// used to append to the description, so re-importing an old export cleans up.
function stripLegacyDescSuffix(desc) {
    if (!desc) return desc || "";
    return desc.replace(/\s*V\s*\d+,\s*\d+,\s*\d+\s*$/, "").trim();
}

// Strip a trailing " §eV<version>§r" title tag this tool writes, so
// re-importing one of our own exports round-trips cleanly.
function stripVersionTitleTag(name) {
    if (!name) return "";
    return name.replace(/\s*§eV[^§]*§r\s*$/, "").trim();
}

function loadManifestIntoState(obj) {
    const fresh = defaultState();
    const fmtRaw = obj.format_version;
    let fmt = (fmtRaw === 3) ? 3 : 2;
    fresh.importedFormatVersion = (fmtRaw === 2 || fmtRaw === 3) ? fmtRaw : fmtRaw;
    fresh.formatVersion = fmt;

    const h = obj.header || {};
    fresh.header.rawName = stripVersionTitleTag(h.name || "");
    fresh.header.description = stripLegacyDescSuffix(h.description || "");
    fresh.header.uuid = h.uuid || "";
    fresh.header.version = h.version !== undefined ? parseVersion(h.version) : zeroVer();
    fresh.header.min_engine_version = h.min_engine_version !== undefined ? parseVersion(h.min_engine_version) : zeroVer();

    if (h.base_game_version !== undefined) {
        fresh.header.base_game_version = parseVersion(h.base_game_version);
        fresh.header.base_game_version_enabled = true;
    }
    if (h.pack_scope !== undefined) {
        fresh.header.pack_scope = h.pack_scope;
        fresh.header.pack_scope_enabled = true;
    }
    if (h.platform_locked !== undefined) {
        fresh.header.platform_locked = !!h.platform_locked;
        fresh.header.platform_locked_enabled = true;
    }
    if (h.allow_random_seed !== undefined) {
        fresh.header.allow_random_seed = !!h.allow_random_seed;
        fresh.header.allow_random_seed_enabled = true;
    }
    if (h.lock_template_options !== undefined) {
        fresh.header.lock_template_options = !!h.lock_template_options;
        fresh.header.lock_template_options_enabled = true;
    }
    if (h.pack_optimization_version !== undefined) {
        fresh.header.pack_optimization_version = String(h.pack_optimization_version);
    }

    fresh.unknownHeader = {};
    Object.keys(h).forEach(k => {
        if (KNOWN_HEADER_KEYS.indexOf(k) === -1) fresh.unknownHeader[k] = h[k];
    });

    fresh.modules = Array.isArray(obj.modules) ? obj.modules.map(m => ({
        id: uid(),
        type: m.type || "resources",
        uuid: m.uuid || "",
        version: m.version !== undefined ? parseVersion(m.version) : zeroVer(),
        language: m.language || "javascript",
        entry: m.entry || "",
        description: m.description || ""
    })) : [];

    fresh.dependencies = Array.isArray(obj.dependencies) ? obj.dependencies.map(d => ({
        id: uid(),
        kind: d.module_name !== undefined ? "module" : "uuid",
        uuid: d.uuid || "",
        module_name: d.module_name || "",
        version: d.module_name !== undefined ? (typeof d.version === "string" ? d.version : verString(parseVersion(d.version))) : parseVersion(d.version)
    })) : [];

    fresh.capabilities = Array.isArray(obj.capabilities) ? obj.capabilities.slice() : [];

    const md = obj.metadata || {};
    fresh.metadata.authors = Array.isArray(md.authors) && md.authors.length ? md.authors.slice() : [""];
    fresh.metadata.license = md.license || "";
    fresh.metadata.url = md.url || "";
    fresh.metadata.product_type = md.product_type || "";
    fresh.metadata.generated_with = md.generated_with || null;
    fresh.metadata.stampGenerator = false;

    fresh.settings = Array.isArray(obj.settings) ? obj.settings.map(s => ({
        id: uid(),
        type: s.type || "label",
        text: s.text || "",
        name: s.name || "",
        default: s.default,
        min: s.min,
        max: s.max,
        step: s.step,
        options: Array.isArray(s.options) ? s.options.map(o => ({ id: uid(), name: o.name || "", text: o.text || "" })) : []
    })) : [];

    fresh.subpacks = Array.isArray(obj.subpacks) ? obj.subpacks.map(sp => ({
        id: uid(),
        folder_name: sp.folder_name || "",
        name: sp.name || "",
        tier: (sp.memory_performance_tier !== undefined) ? sp.memory_performance_tier : (sp.memory_tier !== undefined ? sp.memory_tier : 1)
    })) : [];

    fresh.educationMetadata = !!obj.has_education_metadata;

    fresh.unknownRoot = {};
    Object.keys(obj).forEach(k => {
        if (KNOWN_ROOT_KEYS.indexOf(k) === -1) fresh.unknownRoot[k] = obj[k];
    });

    state = fresh;
    renderAll();
    showDetectBanner();
}

function upgradeToV3() {
    state.formatVersion = 3;
    document.getElementById("format-version").value = "3";
    onFormatVersionChange(true);
}

function showDetectBanner() {
    const el = document.getElementById("detect-banner");
    if (state.importedFormatVersion === null) { el.innerHTML = ""; return; }
    if (state.importedFormatVersion === 2) {
        el.innerHTML = `
            <div class="alert alert-info">
                <span class="alert-body"><span class="badge">v2 detected</span> This manifest was imported as Manifest v2.</span>
                <button class="primary btn-sm interactive" onclick="upgradeToV3()">Upgrade to v3</button>
            </div>`;
    } else if (state.importedFormatVersion === 3) {
        el.innerHTML = `
            <div class="alert alert-success">
                <span class="alert-body"><img class="icon icon-sm" src="https://raw.githubusercontent.com/nako-hikari/assets/main/ui/checkmark.png" alt=""><span class="badge badge-brand">v3 detected</span> This manifest was imported as Manifest v3.</span>
            </div>`;
    } else {
        el.innerHTML = `
            <div class="alert alert-warning">
                <span class="alert-body"><img class="icon icon-sm" src="https://raw.githubusercontent.com/nako-hikari/assets/main/ui/warning.png" alt="">Unrecognized format_version (${JSON.stringify(state.importedFormatVersion)}) in the imported file. Treating it as Manifest v${state.formatVersion} — double-check the result before using it.</span>
            </div>`;
    }
}

function handleFileInput(input) {
    const file = input.files[0];
    if (!file) return;
    document.getElementById("file-status-text").textContent = file.name;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const parsed = JSON.parse(e.target.result);
            document.getElementById("import-paste").value = e.target.result;
            loadManifestIntoState(parsed);
        } catch (err) {
            showModal("Notice", "That file isn't valid JSON.");
        }
    };
    reader.readAsText(file);
}

function handlePasteInput() {
    const raw = document.getElementById("import-paste").value;
    if (!raw.trim()) return;
    try {
        const parsed = JSON.parse(raw);
        loadManifestIntoState(parsed);
    } catch (e) {
        /* keep typing without erroring on every keystroke */
    }
}

function switchStartMode(target) {
    document.getElementById("mode-new-btn").classList.toggle("active", target === "new");
    document.getElementById("mode-import-btn").classList.toggle("active", target === "import");
    document.getElementById("pane-import").classList.toggle("hidden", target !== "import");
    if (target === "new") {
        state = defaultState();
        document.getElementById("import-paste").value = "";
        document.getElementById("file-status-text").textContent = "No file loaded";
        renderAll();
        showDetectBanner();
    }
}

function switchView(target) {
    document.getElementById("view-basic-btn").classList.toggle("active", target === "basic");
    document.getElementById("view-advanced-btn").classList.toggle("active", target === "advanced");
    document.getElementById("view-basic").classList.toggle("hidden", target !== "basic");
    document.getElementById("view-advanced").classList.toggle("hidden", target !== "advanced");
}

function onFormatVersionChange(skipRead) {
    if (!skipRead) state.formatVersion = parseInt(document.getElementById("format-version").value, 10);
    renderAll();
}

function onPackKindChange() {
    state.packKind = document.getElementById("pack-kind").value;
    regenerate();
}

function renderVersionRow(container, verObj, onChange) {
    container.innerHTML = "";
    ["major", "minor", "patch"].forEach((part, idx) => {
        if (idx > 0) {
            const dot = document.createElement("span");
            dot.className = "version-dot";
            dot.textContent = ".";
            container.appendChild(dot);
        }
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.value = verObj[part];
        input.addEventListener("input", () => {
            verObj[part] = parseInt(input.value, 10) || 0;
            onChange();
        });
        container.appendChild(input);
    });
}

function generateHeaderUUID() {
    state.header.uuid = cryptoUUID();
    document.getElementById("hdr-uuid").value = state.header.uuid;
    regenerate();
}

function renderHeader() {
    document.getElementById("hdr-name").value = state.header.rawName;
    document.getElementById("hdr-desc").value = state.header.description;
    document.getElementById("hdr-uuid").value = state.header.uuid;
    renderVersionRow(document.getElementById("hdr-version-row"), state.header.version, regenerate);
    renderVersionRow(document.getElementById("hdr-engine-row"), state.header.min_engine_version, regenerate);

    document.getElementById("format-version").value = String(state.formatVersion);
    document.getElementById("pack-kind").value = state.packKind;

    const badge = document.getElementById("format-badge");
    badge.innerHTML = state.formatVersion === 3
        ? '<span class="badge badge-brand">format_version: 3</span>'
        : '<span class="badge">format_version: 2</span>';

    document.getElementById("settings-card").classList.toggle("hidden", state.formatVersion !== 3);
}

function readHeaderFromInputs() {
    state.header.rawName = document.getElementById("hdr-name").value;
    state.header.description = document.getElementById("hdr-desc").value;
    state.header.uuid = document.getElementById("hdr-uuid").value.trim();
}

function addModule() {
    state.modules.push({ id: uid(), type: "resources", uuid: cryptoUUID(), version: { major: 1, minor: 0, patch: 0 }, language: "javascript", entry: "scripts/main.js", description: "" });
    renderModules();
    regenerate();
}

function removeModule(id) {
    state.modules = state.modules.filter(m => m.id !== id);
    renderModules();
    regenerate();
}

function renderModules() {
    const container = document.getElementById("modules-list");
    container.innerHTML = "";
    state.modules.forEach((m, idx) => {
        const card = document.createElement("div");
        card.className = "item-card";
        card.innerHTML = `
            <div class="item-card-header">
                <h3>Module #${idx + 1}</h3>
                <div class="item-actions">
                    <button class="danger btn-sm interactive" data-act="remove">
                        <img class="icon icon-sm icon-on-brand" src="https://raw.githubusercontent.com/nako-hikari/assets/main/ui/trash.png" alt="">
                        Delete
                    </button>
                </div>
            </div>
            <div class="two-col">
                <div class="row">
                    <label>Type</label>
                    <select data-field="type">
                        ${MODULE_TYPES.map(t => `<option value="${t}" ${m.type === t ? "selected" : ""}>${t}</option>`).join("")}
                    </select>
                </div>
                <div class="row">
                    <label>UUID</label>
                    <div class="row-inline">
                        <input type="text" data-field="uuid" value="${escapeAttr(m.uuid)}">
                        <button class="secondary btn-sm interactive" data-act="gen-uuid">
                            <img class="icon icon-sm" src="https://raw.githubusercontent.com/nako-hikari/assets/main/ui/refresh.png" alt="">
                            New UUID
                        </button>
                    </div>
                </div>
            </div>
            <div class="row">
                <label>Version</label>
                <div class="version-row" data-field="version-row"></div>
            </div>
            <div class="conditional-fields ${m.type === 'script' ? '' : 'hidden'}" data-field="script-fields">
                <div class="two-col">
                    <div class="row">
                        <label>Language</label>
                        <input type="text" value="javascript" disabled>
                    </div>
                    <div class="row">
                        <label>Entry</label>
                        <input type="text" data-field="entry" value="${escapeAttr(m.entry)}" placeholder="scripts/main.js">
                    </div>
                </div>
            </div>
            <div class="row">
                <label>Description <span class="hint">(optional, not user-facing)</span></label>
                <input type="text" data-field="description" value="${escapeAttr(m.description)}">
            </div>
        `;

        card.querySelector('[data-act="remove"]').onclick = () => removeModule(m.id);
        card.querySelector('[data-act="gen-uuid"]').onclick = () => { m.uuid = cryptoUUID(); renderModules(); regenerate(); };
        card.querySelector('[data-field="type"]').onchange = (e) => {
            m.type = e.target.value;
            renderModules();
            regenerate();
        };
        card.querySelector('[data-field="uuid"]').oninput = (e) => { m.uuid = e.target.value.trim(); regenerate(); };
        const entryEl = card.querySelector('[data-field="entry"]');
        if (entryEl) entryEl.oninput = (e) => { m.entry = e.target.value; regenerate(); };
        card.querySelector('[data-field="description"]').oninput = (e) => { m.description = e.target.value; regenerate(); };

        renderVersionRow(card.querySelector('[data-field="version-row"]'), m.version, regenerate);
        container.appendChild(card);
    });
}

function addDependency() {
    state.dependencies.push({ id: uid(), kind: "uuid", uuid: "", module_name: "", version: zeroVer() });
    renderDependencies();
    regenerate();
}

function removeDependency(id) {
    state.dependencies = state.dependencies.filter(d => d.id !== id);
    renderDependencies();
    regenerate();
}

function renderDependencies() {
    const container = document.getElementById("deps-list");
    container.innerHTML = "";
    state.dependencies.forEach((d, idx) => {
        const card = document.createElement("div");
        card.className = "item-card";
        card.innerHTML = `
            <div class="item-card-header">
                <h3>Dependency #${idx + 1} — ${d.kind === "module" ? "Script Module" : "Pack (UUID)"}</h3>
                <div class="item-actions">
                    <button class="danger btn-sm interactive" data-act="remove">
                        <img class="icon icon-sm icon-on-brand" src="https://raw.githubusercontent.com/nako-hikari/assets/main/ui/trash.png" alt="">
                        Delete
                    </button>
                </div>
            </div>
            <div class="row">
                <label>Dependency Type</label>
                <select data-field="kind">
                    <option value="uuid" ${d.kind === "uuid" ? "selected" : ""}>Depends on another pack (by UUID)</option>
                    <option value="module" ${d.kind === "module" ? "selected" : ""}>Depends on a Script API module</option>
                </select>
            </div>
            <div class="conditional-fields ${d.kind === "uuid" ? "" : "hidden"}" data-field="uuid-fields">
                <div class="row">
                    <label>Pack UUID</label>
                    <input type="text" data-field="uuid" value="${escapeAttr(d.uuid)}" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
                </div>
                <div class="row">
                    <label>Version</label>
                    <div class="version-row" data-field="uuid-version-row"></div>
                </div>
            </div>
            <div class="conditional-fields ${d.kind === "module" ? "" : "hidden"}" data-field="module-fields">
                <div class="two-col">
                    <div class="row">
                        <label>Module Name</label>
                        <input type="text" data-field="module_name" value="${escapeAttr(d.module_name)}" placeholder="@minecraft/server">
                    </div>
                    <div class="row">
                        <label>Version</label>
                        <input type="text" data-field="module_version" value="${escapeAttr(typeof d.version === 'string' ? d.version : '')}" placeholder="1.9.0">
                    </div>
                </div>
                <p class="hint">Module names and their available versions aren't invented here — check the Script API documentation for the current values.</p>
            </div>
        `;

        card.querySelector('[data-act="remove"]').onclick = () => removeDependency(d.id);
        card.querySelector('[data-field="kind"]').onchange = (e) => {
            d.kind = e.target.value;
            if (d.kind === "module" && typeof d.version !== "string") d.version = "";
            if (d.kind === "uuid" && typeof d.version === "string") d.version = zeroVer();
            renderDependencies();
            regenerate();
        };
        const uuidField = card.querySelector('[data-field="uuid"]');
        if (uuidField) uuidField.oninput = (e) => { d.uuid = e.target.value.trim(); regenerate(); };
        const moduleNameField = card.querySelector('[data-field="module_name"]');
        if (moduleNameField) moduleNameField.oninput = (e) => { d.module_name = e.target.value; regenerate(); };
        const moduleVerField = card.querySelector('[data-field="module_version"]');
        if (moduleVerField) moduleVerField.oninput = (e) => { d.version = e.target.value; regenerate(); };

        const uuidVerRow = card.querySelector('[data-field="uuid-version-row"]');
        if (uuidVerRow && d.kind === "uuid") renderVersionRow(uuidVerRow, d.version, regenerate);

        container.appendChild(card);
    });
}

function renderCapabilities() {
    const container = document.getElementById("capabilities-list");
    container.innerHTML = "";
    CAPABILITIES.forEach(cap => {
        const wrap = document.createElement("label");
        wrap.className = "checkbox-card checkbox-label";
        const checked = state.capabilities.indexOf(cap.id) !== -1;
        wrap.innerHTML = `
            <input type="checkbox" ${checked ? "checked" : ""}>
            <span class="cc-text"><strong>${cap.label}</strong><span>${cap.desc}</span></span>
        `;
        wrap.querySelector("input").onchange = (e) => {
            if (e.target.checked) {
                if (state.capabilities.indexOf(cap.id) === -1) state.capabilities.push(cap.id);
            } else {
                state.capabilities = state.capabilities.filter(c => c !== cap.id);
            }
            regenerate();
        };
        container.appendChild(wrap);
    });
}

function addAuthor() {
    state.metadata.authors.push("");
    renderAuthors();
    regenerate();
}

function removeAuthor(idx) {
    state.metadata.authors.splice(idx, 1);
    if (state.metadata.authors.length === 0) state.metadata.authors.push("");
    renderAuthors();
    regenerate();
}

function renderAuthors() {
    const container = document.getElementById("authors-list");
    container.innerHTML = "";
    state.metadata.authors.forEach((author, idx) => {
        const row = document.createElement("div");
        row.className = "row-inline";
        row.innerHTML = `
            <input type="text" value="${escapeAttr(author)}" placeholder="Author name">
            <button class="icon-btn interactive" title="Remove">
                <img class="icon icon-sm" src="https://raw.githubusercontent.com/nako-hikari/assets/main/ui/close.png" alt="Remove">
            </button>
        `;
        row.querySelector("input").oninput = (e) => { state.metadata.authors[idx] = e.target.value; regenerate(); };
        row.querySelector("button").onclick = () => removeAuthor(idx);
        container.appendChild(row);
    });

    document.getElementById("meta-license").value = state.metadata.license;
    document.getElementById("meta-url").value = state.metadata.url;
    document.getElementById("meta-product-type").value = state.metadata.product_type;
    document.getElementById("meta-stamp-generator").checked = state.metadata.stampGenerator;

    const hint = document.getElementById("generated-with-hint");
    if (state.metadata.generated_with) {
        hint.textContent = "This manifest already declares a generator (" + Object.keys(state.metadata.generated_with).join(", ") + "). It's kept as-is unless you check the box above.";
    } else {
        hint.textContent = "Off by default so we never overwrite generator info without your say-so.";
    }
}

function readMetadataFromInputs() {
    state.metadata.license = document.getElementById("meta-license").value;
    state.metadata.url = document.getElementById("meta-url").value;
    state.metadata.product_type = document.getElementById("meta-product-type").value;
    state.metadata.stampGenerator = document.getElementById("meta-stamp-generator").checked;
}

function defaultSettingFor(type) {
    if (type === "label") return { id: uid(), type: "label", text: "Section Label" };
    if (type === "toggle") return { id: uid(), type: "toggle", text: "Enable Feature", name: "mypack:my_toggle", default: true };
    if (type === "slider") return { id: uid(), type: "slider", text: "Feature Amount", name: "mypack:my_slider", min: 0, max: 1, step: 0.1, default: 0.5 };
    if (type === "dropdown") return {
        id: uid(), type: "dropdown", text: "Feature Choice", name: "mypack:my_dropdown", default: "option_a",
        options: [{ id: uid(), name: "option_a", text: "Option A" }, { id: uid(), name: "option_b", text: "Option B" }]
    };
    return { id: uid(), type: "label", text: "Label" };
}

function addSetting() {
    const type = document.getElementById("new-setting-type").value;
    state.settings.push(defaultSettingFor(type));
    renderSettings();
    regenerate();
}

function removeSetting(id) {
    state.settings = state.settings.filter(s => s.id !== id);
    renderSettings();
    regenerate();
}

function duplicateSetting(id) {
    const idx = state.settings.findIndex(s => s.id === id);
    if (idx === -1) return;
    const clone = JSON.parse(JSON.stringify(state.settings[idx]));
    clone.id = uid();
    if (clone.options) clone.options = clone.options.map(o => ({ ...o, id: uid() }));
    if (clone.name) {
        let base = clone.name + "_copy";
        let candidate = base;
        let n = 2;
        while (state.settings.some(s => s.name === candidate)) { candidate = base + n; n++; }
        clone.name = candidate;
    }
    state.settings.splice(idx + 1, 0, clone);
    renderSettings();
    regenerate();
}

function moveSetting(id, dir) {
    const idx = state.settings.findIndex(s => s.id === id);
    const target = idx + dir;
    if (idx === -1 || target < 0 || target >= state.settings.length) return;
    const [item] = state.settings.splice(idx, 1);
    state.settings.splice(target, 0, item);
    renderSettings();
    regenerate();
}

function molangFor(setting) {
    if (setting.type === "toggle") return `query.is_pack_setting_enabled('${setting.name || "mypack:setting"}')`;
    if (setting.type === "slider") return `query.get_pack_setting('${setting.name || "mypack:setting"}')`;
    if (setting.type === "dropdown") {
        const firstOpt = (setting.options && setting.options[0] && setting.options[0].name) || "option_name";
        return `query.is_pack_setting_selected('${setting.name || "mypack:setting"}', '${firstOpt}')`;
    }
    return "";
}

function copyText(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        if (btn) {
            btn.classList.add("copy-success");
            setTimeout(() => btn.classList.remove("copy-success"), 1200);
        }
    });
}

function addSettingOption(settingId) {
    const s = state.settings.find(x => x.id === settingId);
    if (!s) return;
    s.options.push({ id: uid(), name: "new_option", text: "New Option" });
    renderSettings();
    regenerate();
}

function removeSettingOption(settingId, optionId) {
    const s = state.settings.find(x => x.id === settingId);
    if (!s) return;
    s.options = s.options.filter(o => o.id !== optionId);
    renderSettings();
    regenerate();
}

function renderSettings() {
    const container = document.getElementById("settings-list");
    container.innerHTML = "";
    state.settings.forEach((s, idx) => {
        const card = document.createElement("div");
        card.className = "item-card";

        let fieldsHtml = "";
        if (s.type === "label") {
            fieldsHtml = `
                <div class="row">
                    <label>Text</label>
                    <input type="text" data-field="text" value="${escapeAttr(s.text)}">
                </div>`;
        } else if (s.type === "toggle") {
            fieldsHtml = `
                <div class="two-col">
                    <div class="row"><label>Display Text</label><input type="text" data-field="text" value="${escapeAttr(s.text)}"></div>
                    <div class="row"><label>Identifier (name)</label><input type="text" data-field="name" value="${escapeAttr(s.name)}" placeholder="mypack:setting_name"></div>
                </div>
                <label class="checkbox-label"><input type="checkbox" data-field="default" ${s.default ? "checked" : ""}> Default value</label>`;
        } else if (s.type === "slider") {
            fieldsHtml = `
                <div class="two-col">
                    <div class="row"><label>Display Text</label><input type="text" data-field="text" value="${escapeAttr(s.text)}"></div>
                    <div class="row"><label>Identifier (name)</label><input type="text" data-field="name" value="${escapeAttr(s.name)}" placeholder="mypack:setting_name"></div>
                </div>
                <div class="three-col">
                    <div class="row"><label>Min</label><input type="number" step="any" data-field="min" value="${s.min}"></div>
                    <div class="row"><label>Max</label><input type="number" step="any" data-field="max" value="${s.max}"></div>
                    <div class="row"><label>Step</label><input type="number" step="any" data-field="step" value="${s.step}"></div>
                </div>
                <div class="row"><label>Default</label><input type="number" step="any" data-field="default" value="${s.default}"></div>`;
        } else if (s.type === "dropdown") {
            fieldsHtml = `
                <div class="two-col">
                    <div class="row"><label>Display Text</label><input type="text" data-field="text" value="${escapeAttr(s.text)}"></div>
                    <div class="row"><label>Identifier (name)</label><input type="text" data-field="name" value="${escapeAttr(s.name)}" placeholder="mypack:setting_name"></div>
                </div>
                <div class="section-header section-header--flush">
                    <label>Options</label>
                    <button class="secondary btn-sm interactive" data-act="add-option">
                        <img class="icon icon-sm" src="https://raw.githubusercontent.com/nako-hikari/assets/main/ui/plus.png" alt="">
                        Add Option
                    </button>
                </div>
                <div class="item-container" data-field="options-list"></div>
                <div class="row">
                    <label>Default (must match an option name)</label>
                    <input type="text" data-field="default" value="${escapeAttr(s.default)}">
                </div>`;
        }

        const molang = molangFor(s);

        card.innerHTML = `
            <div class="item-card-header">
                <h3>#${idx + 1} — ${s.type}</h3>
                <div class="item-actions">
                    <button class="icon-btn interactive" data-act="up" title="Move up">
                        <img class="icon icon-sm" src="https://raw.githubusercontent.com/nako-hikari/assets/main/ui/chevron_up.png" alt="Move up">
                    </button>
                    <button class="icon-btn interactive" data-act="down" title="Move down">
                        <img class="icon icon-sm" src="https://raw.githubusercontent.com/nako-hikari/assets/main/ui/chevron_down.png" alt="Move down">
                    </button>
                    <button class="secondary btn-sm interactive" data-act="dup">
                        <img class="icon icon-sm" src="https://raw.githubusercontent.com/nako-hikari/assets/main/ui/duplicate.png" alt="">
                        Duplicate
                    </button>
                    <button class="danger btn-sm interactive" data-act="remove">
                        <img class="icon icon-sm icon-on-brand" src="https://raw.githubusercontent.com/nako-hikari/assets/main/ui/trash.png" alt="">
                        Delete
                    </button>
                </div>
            </div>
            ${fieldsHtml}
            ${molang ? `<div class="molang-chip"><span>${molang}</span><button class="secondary btn-sm interactive" data-act="copy-molang"><img class="icon icon-sm" src="https://raw.githubusercontent.com/nako-hikari/assets/main/ui/copy.png" alt="">Copy</button></div>` : `<p class="hint">Labels don't have a Molang query — they're display-only.</p>`}
        `;

        card.querySelector('[data-act="remove"]').onclick = () => removeSetting(s.id);
        card.querySelector('[data-act="up"]').onclick = () => moveSetting(s.id, -1);
        card.querySelector('[data-act="down"]').onclick = () => moveSetting(s.id, 1);
        card.querySelector('[data-act="dup"]').onclick = () => duplicateSetting(s.id);
        const copyBtn = card.querySelector('[data-act="copy-molang"]');
        if (copyBtn) copyBtn.onclick = () => copyText(molang, copyBtn);

        const textField = card.querySelector('[data-field="text"]');
        if (textField) textField.oninput = (e) => { s.text = e.target.value; regenerate(); };
        const nameField = card.querySelector('[data-field="name"]');
        if (nameField) nameField.oninput = (e) => { s.name = e.target.value; regenerate(); };

        if (s.type === "toggle") {
            card.querySelector('[data-field="default"]').onchange = (e) => { s.default = e.target.checked; regenerate(); };
        } else if (s.type === "slider") {
            card.querySelector('[data-field="min"]').oninput = (e) => { s.min = parseFloat(e.target.value); regenerate(); };
            card.querySelector('[data-field="max"]').oninput = (e) => { s.max = parseFloat(e.target.value); regenerate(); };
            card.querySelector('[data-field="step"]').oninput = (e) => { s.step = parseFloat(e.target.value); regenerate(); };
            card.querySelector('[data-field="default"]').oninput = (e) => { s.default = parseFloat(e.target.value); regenerate(); };
        } else if (s.type === "dropdown") {
            card.querySelector('[data-field="default"]').oninput = (e) => { s.default = e.target.value; regenerate(); };
            card.querySelector('[data-act="add-option"]').onclick = () => addSettingOption(s.id);
            const optList = card.querySelector('[data-field="options-list"]');
            s.options.forEach(opt => {
                const optRow = document.createElement("div");
                optRow.className = "row-inline";
                optRow.innerHTML = `
                    <input type="text" class="flex-1" placeholder="identifier" value="${escapeAttr(opt.name)}">
                    <input type="text" class="flex-1" placeholder="Display text" value="${escapeAttr(opt.text)}">
                    <button class="icon-btn interactive" title="Remove">
                        <img class="icon icon-sm" src="https://raw.githubusercontent.com/nako-hikari/assets/main/ui/close.png" alt="Remove">
                    </button>
                `;
                const inputs = optRow.querySelectorAll("input");
                inputs[0].oninput = (e) => { opt.name = e.target.value; regenerate(); };
                inputs[1].oninput = (e) => { opt.text = e.target.value; regenerate(); };
                optRow.querySelector("button").onclick = () => removeSettingOption(s.id, opt.id);
                optList.appendChild(optRow);
            });
        }

        container.appendChild(card);
    });
}

function addSubpack() {
    state.subpacks.push({ id: uid(), folder_name: "subpack_folder", name: "Subpack Name", tier: 1 });
    renderSubpacks();
    regenerate();
}

function removeSubpack(id) {
    state.subpacks = state.subpacks.filter(sp => sp.id !== id);
    renderSubpacks();
    regenerate();
}

function renderSubpacks() {
    const container = document.getElementById("subpacks-list");
    container.innerHTML = "";
    const tierLabel = state.formatVersion === 3 ? "Memory Performance Tier (1–5)" : "Memory Tier";
    state.subpacks.forEach((sp, idx) => {
        const card = document.createElement("div");
        card.className = "item-card";
        card.innerHTML = `
            <div class="item-card-header">
                <h3>Subpack #${idx + 1}</h3>
                <button class="danger btn-sm interactive" data-act="remove">
                    <img class="icon icon-sm icon-on-brand" src="https://raw.githubusercontent.com/nako-hikari/assets/main/ui/trash.png" alt="">
                    Delete
                </button>
            </div>
            <div class="three-col">
                <div class="row"><label>Folder Name</label><input type="text" data-field="folder_name" value="${escapeAttr(sp.folder_name)}"></div>
                <div class="row"><label>Display Name</label><input type="text" data-field="name" value="${escapeAttr(sp.name)}"></div>
                <div class="row"><label>${tierLabel}</label><input type="number" min="0" data-field="tier" value="${sp.tier}"></div>
            </div>
        `;
        card.querySelector('[data-act="remove"]').onclick = () => removeSubpack(sp.id);
        card.querySelector('[data-field="folder_name"]').oninput = (e) => { sp.folder_name = e.target.value; regenerate(); };
        card.querySelector('[data-field="name"]').oninput = (e) => { sp.name = e.target.value; regenerate(); };
        card.querySelector('[data-field="tier"]').oninput = (e) => { sp.tier = parseInt(e.target.value, 10) || 0; regenerate(); };
        container.appendChild(card);
    });
}

function renderAdvancedHeaderOptions() {
    document.getElementById("adv-education").checked = state.educationMetadata;

    document.getElementById("adv-platform-locked-enabled").checked = state.header.platform_locked_enabled;
    document.getElementById("adv-platform-locked").value = String(state.header.platform_locked);

    document.getElementById("adv-random-seed-enabled").checked = state.header.allow_random_seed_enabled;
    document.getElementById("adv-random-seed").value = String(state.header.allow_random_seed);

    document.getElementById("adv-lock-template-enabled").checked = state.header.lock_template_options_enabled;
    document.getElementById("adv-lock-template").value = String(state.header.lock_template_options);

    document.getElementById("adv-pack-scope-enabled").checked = state.header.pack_scope_enabled;
    document.getElementById("adv-pack-scope").value = state.header.pack_scope;

    document.getElementById("adv-base-game-enabled").checked = state.header.base_game_version_enabled;
    renderVersionRow(document.getElementById("adv-base-game-row"), state.header.base_game_version, regenerate);
    document.getElementById("adv-base-game-row").classList.toggle("disabled", !state.header.base_game_version_enabled);

    document.getElementById("adv-optimization-version").value = state.header.pack_optimization_version;
}

function readAdvancedHeaderOptions() {
    state.educationMetadata = document.getElementById("adv-education").checked;

    state.header.platform_locked_enabled = document.getElementById("adv-platform-locked-enabled").checked;
    state.header.platform_locked = document.getElementById("adv-platform-locked").value === "true";

    state.header.allow_random_seed_enabled = document.getElementById("adv-random-seed-enabled").checked;
    state.header.allow_random_seed = document.getElementById("adv-random-seed").value === "true";

    state.header.lock_template_options_enabled = document.getElementById("adv-lock-template-enabled").checked;
    state.header.lock_template_options = document.getElementById("adv-lock-template").value === "true";

    state.header.pack_scope_enabled = document.getElementById("adv-pack-scope-enabled").checked;
    state.header.pack_scope = document.getElementById("adv-pack-scope").value;

    state.header.base_game_version_enabled = document.getElementById("adv-base-game-enabled").checked;
    state.header.pack_optimization_version = document.getElementById("adv-optimization-version").value;

    document.getElementById("adv-base-game-row").classList.toggle("disabled", !state.header.base_game_version_enabled);
}

function renderUnknownFields() {
    const body = document.getElementById("unknown-fields-body");
    const rootKeys = Object.keys(state.unknownRoot);
    const headerKeys = Object.keys(state.unknownHeader);
    if (rootKeys.length === 0 && headerKeys.length === 0) {
        body.innerHTML = '<p class="hint">None — nothing unrecognized in the current manifest.</p>';
        return;
    }
    let html = "";
    if (rootKeys.length) {
        html += `<p class="hint">Top-level: ${rootKeys.join(", ")}</p><div class="unknown-field-block">${escapeHtml(JSON.stringify(state.unknownRoot, null, 2))}</div>`;
    }
    if (headerKeys.length) {
        html += `<p class="hint">Header: ${headerKeys.join(", ")}</p><div class="unknown-field-block">${escapeHtml(JSON.stringify(state.unknownHeader, null, 2))}</div>`;
    }
    body.innerHTML = html;
}

function buildOutput() {
    const fmt = state.formatVersion;
    const displayName = `${state.header.rawName}${state.header.rawName ? " " : ""}§eV${verString(state.header.version)}§r`;

    const header = Object.assign({}, state.unknownHeader, {
        name: displayName,
        description: state.header.description,
        uuid: state.header.uuid,
        version: verOutput(state.header.version, fmt),
        min_engine_version: verOutput(state.header.min_engine_version, fmt)
    });

    if (state.header.base_game_version_enabled) header.base_game_version = verOutput(state.header.base_game_version, fmt);
    if (state.header.pack_scope_enabled) header.pack_scope = state.header.pack_scope;
    if (state.header.platform_locked_enabled) header.platform_locked = state.header.platform_locked;
    if (state.header.allow_random_seed_enabled) header.allow_random_seed = state.header.allow_random_seed;
    if (state.header.lock_template_options_enabled) header.lock_template_options = state.header.lock_template_options;
    if (state.header.pack_optimization_version) header.pack_optimization_version = state.header.pack_optimization_version;

    const modules = state.modules.map(m => {
        const mod = { type: m.type, uuid: m.uuid, version: verOutput(m.version, fmt) };
        if (m.description) mod.description = m.description;
        if (m.type === "script") {
            mod.language = "javascript";
            mod.entry = m.entry;
        }
        return mod;
    });

    const dependencies = state.dependencies.map(d => {
        if (d.kind === "module") {
            return { module_name: d.module_name, version: d.version };
        }
        return { uuid: d.uuid, version: verOutput(d.version, fmt) };
    });

    const authors = state.metadata.authors.map(a => a.trim()).filter(Boolean);
    const metadata = {};
    if (authors.length) metadata.authors = authors;
    if (state.metadata.license) metadata.license = state.metadata.license;
    if (state.metadata.url) metadata.url = state.metadata.url;
    if (state.metadata.product_type) metadata.product_type = state.metadata.product_type;

    let generatedWith = state.metadata.generated_with;
    if (state.metadata.stampGenerator) {
        generatedWith = generatedWith ? Object.assign({}, generatedWith) : {};
        const existingVersions = Array.isArray(generatedWith[GENERATOR_TOOL_NAME]) ? generatedWith[GENERATOR_TOOL_NAME] : [];
        if (existingVersions[existingVersions.length - 1] !== GENERATOR_TOOL_VERSION) {
            generatedWith[GENERATOR_TOOL_NAME] = existingVersions.concat([GENERATOR_TOOL_VERSION]);
        } else {
            generatedWith[GENERATOR_TOOL_NAME] = existingVersions;
        }
    }
    if (generatedWith) metadata.generated_with = generatedWith;

    const manifest = Object.assign({}, state.unknownRoot, {
        format_version: fmt,
        header,
        modules
    });

    if (dependencies.length) manifest.dependencies = dependencies;
    if (state.capabilities.length) manifest.capabilities = state.capabilities.slice();
    if (Object.keys(metadata).length) manifest.metadata = metadata;

    if (fmt === 3 && state.settings.length) {
        manifest.settings = state.settings.map(s => {
            if (s.type === "label") return { type: "label", text: s.text };
            if (s.type === "toggle") return { type: "toggle", text: s.text, name: s.name, default: !!s.default };
            if (s.type === "slider") return { type: "slider", text: s.text, name: s.name, min: s.min, max: s.max, step: s.step, default: s.default };
            if (s.type === "dropdown") return {
                type: "dropdown", text: s.text, name: s.name,
                options: s.options.map(o => ({ name: o.name, text: o.text })),
                default: s.default
            };
            return s;
        });
    }

    if (state.subpacks.length) {
        const tierKey = fmt === 3 ? "memory_performance_tier" : "memory_tier";
        manifest.subpacks = state.subpacks.map(sp => {
            const out = { folder_name: sp.folder_name, name: sp.name };
            out[tierKey] = sp.tier;
            return out;
        });
    }

    if (state.educationMetadata) manifest.has_education_metadata = true;

    return manifest;
}

function validate() {
    const issues = [];
    const err = (msg) => issues.push({ level: "error", msg });
    const warn = (msg) => issues.push({ level: "warning", msg });

    if (!state.header.rawName.trim()) err("Header: Name is required.");
    if (!state.header.uuid) err("Header: UUID is required.");
    else if (!UUID_RE.test(state.header.uuid)) err(`Header: "${state.header.uuid}" is not a valid UUID.`);

    if (state.modules.length === 0) err("At least one module is required.");

    const moduleUuids = [];
    state.modules.forEach((m, i) => {
        const label = `Module #${i + 1}`;
        if (!m.uuid) err(`${label}: UUID is required.`);
        else if (!UUID_RE.test(m.uuid)) err(`${label}: "${m.uuid}" is not a valid UUID.`);
        else {
            if (moduleUuids.indexOf(m.uuid) !== -1) err(`${label}: duplicate module UUID.`);
            moduleUuids.push(m.uuid);
            if (m.uuid === state.header.uuid) warn(`${label}: UUID matches the pack (header) UUID — module UUIDs are normally distinct from the header UUID.`);
        }
        if (m.type === "script") {
            if (!m.entry.trim()) err(`${label}: script modules need an entry file path (e.g. scripts/main.js).`);
        }
    });

    state.dependencies.forEach((d, i) => {
        const label = `Dependency #${i + 1}`;
        if (d.kind === "uuid") {
            if (!d.uuid) err(`${label}: UUID is required.`);
            else if (!UUID_RE.test(d.uuid)) err(`${label}: "${d.uuid}" is not a valid UUID.`);
            else if (d.uuid === state.header.uuid) warn(`${label}: this pack depends on its own UUID.`);
        } else {
            if (!d.module_name.trim()) err(`${label}: module_name is required.`);
            if (!String(d.version).trim()) warn(`${label}: no version specified for this module dependency.`);
        }
    });

    if (state.formatVersion === 3) {
        const nonEmptyAuthors = state.metadata.authors.map(a => a.trim()).filter(Boolean);
        if (nonEmptyAuthors.length === 0) {
            err("Metadata: Manifest v3 currently requires at least one author in metadata.authors (a known v3 processing issue) — add one or the manifest may be rejected.");
        }
    }

    if (state.formatVersion !== 3 && state.settings.length > 0) {
        warn(`You have ${state.settings.length} Pack Setting(s) defined, but Manifest v2 doesn't support Pack Settings. They'll be left out of the generated JSON until you switch to v3.`);
    }

    if (state.formatVersion === 3) {
        const settingNames = [];
        state.settings.forEach((s, i) => {
            const label = `Setting #${i + 1} ("${s.text || s.type}")`;
            if (s.type !== "label") {
                if (!s.name || !s.name.trim()) {
                    err(`${label}: needs an identifier (name).`);
                } else {
                    if (settingNames.indexOf(s.name) !== -1) err(`${label}: duplicate setting name "${s.name}" — setting names must be unique.`);
                    settingNames.push(s.name);
                    if (s.name.indexOf(":") === -1) warn(`${label}: "${s.name}" isn't namespaced — consider "mypack:${s.name}".`);
                }
            }
            if (s.type === "slider") {
                if (!(s.min <= s.max)) err(`${label}: min must be ≤ max.`);
                if (!(s.step > 0)) err(`${label}: step must be greater than 0.`);
                if (!(s.min <= s.default && s.default <= s.max)) err(`${label}: default value ${s.default} is outside the allowed range ${s.min}–${s.max}.`);
            }
            if (s.type === "dropdown") {
                if (!s.options || s.options.length === 0) {
                    err(`${label}: needs at least one option.`);
                } else {
                    const optNames = s.options.map(o => o.name);
                    const dupOpt = optNames.some((n, idx) => optNames.indexOf(n) !== idx);
                    if (dupOpt) err(`${label}: duplicate option identifiers.`);
                    if (optNames.indexOf(s.default) === -1) err(`${label}: default "${s.default}" doesn't match any option's identifier.`);
                }
            }
        });
    }

    state.subpacks.forEach((sp, i) => {
        const label = `Subpack #${i + 1}`;
        if (!sp.folder_name.trim()) err(`${label}: folder_name is required.`);
        if (!sp.name.trim()) err(`${label}: display name is required.`);
        if (state.formatVersion === 3 && (sp.tier < 1 || sp.tier > 5)) warn(`${label}: memory_performance_tier is documented as ranging 1–5 (currently ${sp.tier}).`);
    });

    const unknownCount = Object.keys(state.unknownRoot).length + Object.keys(state.unknownHeader).length;
    if (unknownCount > 0) {
        warn(`${unknownCount} unrecognized field(s) were preserved from the imported manifest. Check the Advanced → Unknown Fields panel and confirm they're still compatible with format_version ${state.formatVersion}.`);
    }

    return issues;
}

function renderValidation(issues) {
    const container = document.getElementById("validation-list");
    if (issues.length === 0) {
        container.innerHTML = `<p class="validation-empty"><img class="icon icon-sm" src="https://raw.githubusercontent.com/nako-hikari/assets/main/ui/checkmark.png" alt="">No issues found.</p>`;
        return;
    }
    container.innerHTML = issues.map(i => `
        <div class="validation-item ${i.level}">
            <img class="icon icon-sm" src="https://raw.githubusercontent.com/nako-hikari/assets/main/ui/${i.level === "error" ? "error" : "warning"}.png" alt="">
            <span>${escapeHtml(i.msg)}</span>
        </div>
    `).join("");
}

function escapeAttr(str) {
    return String(str === undefined || str === null ? "" : str)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function escapeHtml(str) {
    return escapeAttr(str);
}

function regenerate() {
    readHeaderFromInputs();
    readMetadataFromInputs();
    readAdvancedHeaderOptions();

    const output = buildOutput();
    document.getElementById("output-view").textContent = JSON.stringify(output, null, 4);

    const issues = validate();
    renderValidation(issues);
}

function renderAll() {
    renderHeader();
    renderModules();
    renderDependencies();
    renderCapabilities();
    renderAuthors();
    renderSubpacks();
    renderSettings();
    renderAdvancedHeaderOptions();
    renderUnknownFields();
    regenerate();
}

function copyConfig() {
    const data = document.getElementById("output-view").textContent;
    navigator.clipboard.writeText(data).then(() => {
        const btn = document.getElementById("copy-config-btn");
        btn.classList.add("copy-success");
        setTimeout(() => btn.classList.remove("copy-success"), 1200);
    });
}

function downloadConfig() {
    const data = document.getElementById("output-view").textContent;
    if (!data || data === "{}") return;
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "manifest.json";
    a.click();
    URL.revokeObjectURL(url);
}

function toggleTheme() {
    const root = document.documentElement;
    const btn = document.querySelector('.theme-toggle');
    const icon = document.getElementById('theme-icon');
    const goingLight = root.getAttribute('data-theme') !== 'light';

    btn.classList.add('spinning');
    setTimeout(() => btn.classList.remove('spinning'), 400);

    if (goingLight) {
        root.setAttribute('data-theme', 'light');
        icon.src = 'https://raw.githubusercontent.com/nako-hikari/assets/main/ui/sun.png';
        localStorage.setItem('nako-theme', 'light');
    } else {
        root.removeAttribute('data-theme');
        icon.src = 'https://raw.githubusercontent.com/nako-hikari/assets/main/ui/moon.png';
        localStorage.setItem('nako-theme', 'dark');
    }
}

(function() {
    if (localStorage.getItem('nako-theme') === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        document.getElementById('theme-icon').src = 'https://raw.githubusercontent.com/nako-hikari/assets/main/ui/sun.png';
    }
})();

function showModal(title, message, options) {
    options = options || {};
    document.getElementById('nakoModalTitle').textContent = title;
    document.getElementById('nakoModalBody').textContent = message;

    const footer = document.getElementById('nakoModalFooter');
    footer.innerHTML = '';

    if (options.onConfirm) {
        const cancel = document.createElement('button');
        cancel.className = 'secondary interactive';
        cancel.textContent = options.cancelText || 'Cancel';
        cancel.onclick = closeNakoModal;
        footer.appendChild(cancel);

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'primary interactive';
        confirmBtn.textContent = options.confirmText || 'Confirm';
        confirmBtn.onclick = () => { closeNakoModal(); options.onConfirm(); };
        footer.appendChild(confirmBtn);
    } else {
        const ok = document.createElement('button');
        ok.className = 'secondary interactive';
        ok.textContent = 'OK';
        ok.onclick = closeNakoModal;
        footer.appendChild(ok);
    }

    document.getElementById('nakoModal').classList.add('open');
}

function closeNakoModal() {
    document.getElementById('nakoModal').classList.remove('open');
}

document.getElementById('nakoModal').addEventListener('click', e => {
    if (e.target.id === 'nakoModal') closeNakoModal();
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeNakoModal();
});

renderAll();
