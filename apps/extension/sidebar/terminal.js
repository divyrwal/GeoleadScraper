/**
 * sidebar/terminal.js
 * Handles the visual terminal UI in the extension sidebar.
 *
 * v7.1 — SMELL-5: Append-only rendering instead of full innerHTML re-render.
 * Only re-renders the full list when trimming old lines.
 */

export class Terminal {
    constructor(terminalElementId) {
        this.terminalLog = document.getElementById(terminalElementId);
        this.terminalLines = [];
        this.MAX_LINES = 100;
    }

    add(text, type = '') {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const entry = { text: `[${timestamp}] ${text}`, type };
        this.terminalLines.push(entry);

        if (this.terminalLines.length > this.MAX_LINES) {
            // Trim oldest lines and do a full re-render
            this.terminalLines = this.terminalLines.slice(-this.MAX_LINES);
            this._fullRender();
        } else {
            // SMELL-5: Append-only — just add the new line element
            this._appendLine(entry);
        }
    }

    _appendLine(entry) {
        if (!this.terminalLog) return;
        const div = document.createElement('div');
        div.className = `log-line ${entry.type}`;
        div.textContent = entry.text;
        this.terminalLog.appendChild(div);
        this.terminalLog.scrollTop = this.terminalLog.scrollHeight;
    }

    _fullRender() {
        if (!this.terminalLog) return;
        this.terminalLog.innerHTML = '';
        this.terminalLines.forEach(entry => this._appendLine(entry));
    }

    clear() {
        this.terminalLines = [];
        if (this.terminalLog) this.terminalLog.innerHTML = '';
    }

    escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}
