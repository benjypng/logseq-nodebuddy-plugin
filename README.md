# logseq-nodebuddy-plugin
![Version](https://img.shields.io/github/v/release/benjypng/logseq-nodebuddy-plugin?style=flat-square&color=0969da) ![Downloads](https://img.shields.io/github/downloads/benjypng/logseq-nodebuddy-plugin/total?style=flat-square&color=orange) ![License](https://img.shields.io/github/license/benjypng/logseq-nodebuddy-plugin?style=flat-square)

> Your AI NodeBuddy, right inside your graph. Supports cloud and local models.

---

## ✨ Features
* **Context Injection:** Use **@currentpage** to feed the full page context or **#tag**/**[[block reference]]** to pull in all blocks into the chat context.
* **Graph Integration:** Every conversation is saved as a real Logseq page (`[[NodeBuddy:Session]]`) for future reference.
* **Seamless UI:** Sidebar interface that adapts to your theme and allows you to continue navigating your graph.
* **Local and Cloud Support:** Supports both local and cloud models.

### Context Injection vs MCP
NodeBuddy currently relies on **Explicit Context Injection** rather than the **Model Context Protocol (MCP)** (Logseq supports MCP out of the box).

* **Context Injection (NodeBuddy):** By using triggers like `@currentpage`, `[[block reference]]`, or `#tag`, you deterministically pass specific slices of your graph to the LLM. This ensures the model focuses on the data you deem relevant, reducing hallucinations, latency, and "noise" in the conversation.
* **MCP:** While MCP allows AI models to autonomously "browse" and query external data sources, it often requires complex server setups. NodeBuddy prioritizes a lightweight, user-driven approach. 

### Current Supported Models
*  'gemini-2.5-flash-lite'
*  'gemini-2.5-flash'
*  'gemma3:27b'
*  'gemma2:27b'

## 📸 Screenshots / Demo
![](./demo.gif)

## ⚙️ Installation
1.  Open Logseq.
2.  Go to the **Marketplace** (Plugins > Marketplace).
3.  Search for **logseq-nodebuddy**.
4.  Click **Install**.

## 🛠 Usage & Settings
#### Opening the Plugin
1. Trigger the command palette (`Mod+Shift+p`) and use the command `NodeBuddy: Open Chat`.
2. You can also use the shortcut `mod+shift+n`.
3. The plugin will open as a dedicated sidebar on the right side of your screen.

#### The Context Workflow
NodeBuddy shines when you give it data to work with:
1.  **Page Context:** Type `@currentpage` in your prompt to instantly feed the hierarchy of the current page (or zoomed block) to the AI.
2.  **Tag Context:** Type `#meeting`, `#project`, or any other tag to pull in all blocks tagged with that keyword.
2.  **Block Reference Context:** Type `[[John Smith]]`, `[[Quantum Physics]]` to pull in all linked references with that keyword.

#### Chat History
1.  Every chat session creates a new page in your graph.
2.  Sessions are automatically tagged with `[[NodeBuddy:Session]]`.
3.  These pages should not be edited as the LLM relies on them for context.

#### Settings
Go to `Logseq Settings > Plugin Settings > NodeBuddy` to configure:
* **API Key:** Your Google Gemini API Key (Required).
* **Model:** The specific model version to use (Defaults to `gemini-2.5-flash`).
* **NodeBuddy Tag:** The tag used to identify session pages (Defaults to `NodeBuddy`).

## ☕️ Support
If you enjoy this plugin, please consider supporting the development.

<div align="center">
  <a href="https://github.com/sponsors/yourusername"><img src="https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?style=for-the-badge&logo=github" alt="Sponsor on Github" /></a>&nbsp;<a href="https://www.buymeacoffee.com/yourusername"><img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me a Coffee" /></a>
</div>

## 🤝 Contributing
Issues are welcome. If you find a bug, please open an issue. Pull requests are not accepted at the moment as I am not able to commit to reviewing them in a timely fashion.
