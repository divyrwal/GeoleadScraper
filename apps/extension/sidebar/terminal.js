/**
 * sidebar/terminal.js
 * Handles the visual terminal UI in the extension sidebar.
 */

export class Terminal {
    constructor(terminalElementId) {
        this.terminalLog = document.getElementById(terminalElementId);
        this.terminalLines = [];
        this.MAX_LINES = 100;
    }

    add(text, type = '') {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.terminalLines.push({ text: `[${timestamp}] ${text}`, type });

        if (this.terminalLines.length > this.MAX_LINES) {
            this.terminalLines.shift();
        }

        this.render();
    }

    render() {
        if (!this.terminalLog) return;
        this.terminalLog.innerHTML = this.terminalLines.map(l =>
            `<div class="log-line ${l.type}">${this.escapeHtml(l.text)}</div>`
        ).join('');
        this.terminalLog.scrollTop = this.terminalLog.scrollHeight;
    }

    clear() {
        this.terminalLines = [];
        if (this.terminalLog) this.terminalLog.innerHTML = '';
    }

    escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}
