# labs-agent-workflow — plugin root and template path resolution

**Use this for every skill** that reads **`workflow.md`**, **`agent-handoff.md`**, **`bug_report.md`**, **`work_order.md`**, **`context.md`**, or other files under **`.github/templates/`** in consumer documentation.

Nothing here assumes a fixed disk path — each user’s marketplace install and workspace layout differ.

---

## Definitions

| Symbol | Meaning |
|--------|---------|
| **`REPO_ROOT`** | Root of the **consumer project** where tickets live (`./.github/Sprint */`, application code). Usually the workspace / working directory for ticket work. |
| **`PLUGIN_ROOT`** | Root of the **`labs-agent-workflow`** plugin: directory that contains **`skills/`**, **`templates/`**, and **`.claude-plugin/plugin.json`**. |

When developing **this plugin repo**, **`REPO_ROOT`** and **`PLUGIN_ROOT`** may be the **same** directory — still apply resolution order below so **`workflow.md`** is found under **`templates/`** when **`.github/templates/`** does not exist yet.

---

## Discover `PLUGIN_ROOT` (first match wins)

Do **not** hardcode paths from another machine or OS. Resolve dynamically:

1. **`CLAUDE_OPS_PLUGIN_ROOT`** (optional) — If set, must be an absolute path to a directory that contains **`templates/workflow.md`**. Lets users or CI pin the plugin root when the IDE does not inject paths. **Never commit user-specific paths into repositories.**

2. **`CLAUDE_PLUGIN_ROOT`** — Claude Code sets this for plugin sessions. Use only if **`{CLAUDE_PLUGIN_ROOT}/templates/workflow.md`** exists **and** **`{CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`** has **`"name": "labs-agent-workflow"`**.

3. **Glob** the workspace for `.claude-plugin/plugin.json` (search pattern such as `**/.claude-plugin/plugin.json`). **`Read`** each file; when **`name`** is **`labs-agent-workflow`**, **`PLUGIN_ROOT`** is the directory **containing** `.claude-plugin/`.

4. **Glob** for `skills/create-ticket/SKILL.md`. When the match path contains **`labs-agent-workflow`**, **`PLUGIN_ROOT`** is the parent directory of **`skills/`**.

5. **Anchor from this file** — If you successfully **`Read`** **`skills/conventions/01-plugin-root-and-templates.md`** via a resolved path, **`PLUGIN_ROOT`** is the directory **two levels above** this file’s directory (**parent of `skills/`**: `…/skills/conventions/…` → `…/` is **`PLUGIN_ROOT`**).

If **`PLUGIN_ROOT`** still cannot be determined, stop and report which discovery steps failed.

---

## Resolve a template file by name

For basename **`workflow.md`**, **`agent-handoff.md`**, **`bug_report.md`**, **`work_order.md`**, **`context.md`**, etc.:

1. **`{REPO_ROOT}/.github/templates/{basename}`** — team-configured copy after **`/project-start`** (or manual edits).

2. **`{PLUGIN_ROOT}/templates/{basename}`** — bundled defaults shipped with **`labs-agent-workflow`**.

Use the **first path where `Read` succeeds**.

---

## Resolve `workflow.md` only (shortcut)

Same as **`workflow.md`** row in the table above — **consumer templates override plugin defaults.**

---

## Consumer skills checklist

Skills that previously said “read `.github/templates/workflow.md`” must instead **resolve** **`workflow.md`** using this document and **then** **`Read`** the resolved path.

---

## Bundled vs configured `workflow.md`

**`{PLUGIN_ROOT}/templates/workflow.md`** may still contain **`[CONFIGURE: github | jira]`** until **`/project-start`** or manual configuration. If **Backend** is unresolved after reading the resolved file, stop and tell the user to finish **`/project-start`** in **`REPO_ROOT`** (or edit **`workflow.md`**).
