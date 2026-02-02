const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * ==============================================================
 * Project Monitor - Sakura Theme (Silent Console Edition)
 * Author: Losy
 * Feature: Auto-Restart Logging (Debug Page Only, No Console Log)
 * ==============================================================
 */

const PORT = process.env.SERVER_PORT || 8080; 
const CHECK_INTERVAL = 60 * 1000;    
const PWD_DIR = path.join(__dirname, '.npm');
const PWD_FILE = path.join(PWD_DIR, 'sub.txt');

let CURRENT_ADMIN_PASSWORD = "";
let restartHistory = []; 

const MONITOR_LIST = [
    { name: "Personal Blog", icon: "✍️", target: "https://yacolo-ru.milan.us.kg", restartUrl: "http://yacolo.milan.us.kg/restart", activeText: "Writing Content", offlineText: "Inspiration Lost" },
    { name: "Network Tech", icon: "🌐", target: "https://yacolo-moscow.milan.us.kg", restartUrl: "http://moscow.milan.us.kg/restart", activeText: "Data Syncing", offlineText: "Link Interrupted" },
    { name: "Cloud Computing", icon: "☁️", target: "https://yacolo-fr.milan.us.kg", restartUrl: "http://france.milan.us.kg/restart", activeText: "High Speed Run", offlineText: "Node Down" },
    { name: "System Security", icon: "🛡️", target: "https://hostgta-ru.milan.us.kg", restartUrl: "https://whg96251.hgweb.ru/restart", activeText: "Protecting", offlineText: "Shield Failure" }
];

let projectData = MONITOR_LIST.map((item, index) => ({
    id: index,
    ...item,
    status: "initializing",
    projectStatus: "checking",
    displayStatus: "Waiting...",
    lastRawStatus: "N/A"
}));

function initSecurity() {
    if (!fs.existsSync(PWD_DIR)) fs.mkdirSync(PWD_DIR, { recursive: true });
    CURRENT_ADMIN_PASSWORD = crypto.randomBytes(8).toString('hex');
    const content = `GLOBAL ADMIN PASSWORD: ${CURRENT_ADMIN_PASSWORD}\nGenerated: ${new Date().toLocaleString()}\nAuthor: Losy`;
    fs.writeFileSync(PWD_FILE, content, 'utf8');
}

class ProjectGuardian {
    constructor(project) { this.project = project; }
    
    async check() {
        return new Promise((resolve) => {
            const protocol = this.project.target.startsWith('https') ? https : http;
            const req = protocol.get(this.project.target, { timeout: 8000 }, async (res) => {
                const isAlive = (res.statusCode === 200 || res.statusCode === 404);
                this.updateStatus(res.statusCode, isAlive);
                if (!isAlive) await this.autoRecover();
                resolve(isAlive);
            });
            req.on('error', async (err) => {
                this.updateStatus(err.message, false);
                await this.autoRecover();
                resolve(false);
            });
        });
    }

    updateStatus(raw, alive) {
        this.project.lastRawStatus = raw;
        this.project.status = alive ? "running" : "offline";
        this.project.projectStatus = alive ? "online" : "offline";
        this.project.displayStatus = alive ? this.project.activeText : this.project.offlineText;
    }

    async autoRecover() {
        const timeStr = new Date().toLocaleString();
        // Console log removed as per request
        const success = await this.recover();
        const logEntry = `[${timeStr}] ${this.project.name} - ${success ? "RESTART SUCCESS" : "RESTART FAILED"}`;
        restartHistory.unshift(logEntry); 
        if (restartHistory.length > 50) restartHistory.pop(); 
    }

    async recover() {
        const url = this.project.restartUrl;
        const protocol = url.startsWith('https') ? https : http;
        return new Promise((resolve) => {
            protocol.get(url, (res) => resolve(res.statusCode === 200)).on('error', () => resolve(false));
        });
    }
}

const guardians = projectData.map(p => new ProjectGuardian(p));

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/debug') {
        let debugLog = `=== PROJECT MONITOR DEBUG LOG ===\nTime: ${new Date().toISOString()}\n\n`;
        debugLog += `--- REAL-TIME STATUS ---\n`;
        projectData.forEach(p => {
            debugLog += `[${p.name}] Status: ${p.lastRawStatus} | Project: ${p.projectStatus}\n`;
        });
        debugLog += `\n--- AUTO-RESTART HISTORY (Last 50) ---\n`;
        debugLog += restartHistory.length > 0 ? restartHistory.join('\n') : "No execution record yet.";
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(debugLog);
    }

    if (url.pathname === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(projectData));
    }

    if (url.pathname === '/api/recover') {
        const key = url.searchParams.get('key');
        if (key !== CURRENT_ADMIN_PASSWORD) return res.end(JSON.stringify({success:false}));
        const id = url.searchParams.get('id');
        const success = await guardians[id].recover();
        return res.end(JSON.stringify({ success }));
    }

    // UI Rendering
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Sakura Monitor</title>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            :root { --bg: #fff5f7; --sakura: #ffb7c5; --deep: #ff69b4; --green: #52c41a; --red: #ff4d4f; }
            body { font-family: sans-serif; background: var(--bg); margin: 0; padding: 40px; display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
            .header { text-align: center; margin-bottom: 50px; position: relative; width: 100%; max-width: 1000px; }
            .header h1 { color: var(--deep); font-size: 2.5rem; margin: 0; }
            .auth-area { position: absolute; top: 0; right: 0; cursor: pointer; color: var(--deep); font-size: 1.8rem; }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px; width: 100%; max-width: 1200px; }
            .card { background: white; border-radius: 24px; padding: 30px; box-shadow: 0 10px 25px rgba(255,183,197,0.3); border: 2px solid var(--sakura); transition: 0.4s; text-align: left; }
            .card:hover { animation: heartbeat 1.2s infinite; border-color: var(--deep); }
            @keyframes heartbeat { 0%, 28%, 70% { transform: scale(1); } 14%, 42% { transform: scale(1.03); } }
            .breathing { width: 14px; height: 14px; border-radius: 50%; display: inline-block; margin-right: 10px; vertical-align: middle; }
            .br-on { background: var(--green); animation: glow-on 2s infinite; }
            .br-off { background: var(--red); animation: glow-off 2s infinite; }
            @keyframes glow-on { 0%, 100% { box-shadow: 0 0 5px var(--green); } 50% { box-shadow: 0 0 18px var(--green); } }
            @keyframes glow-off { 0%, 100% { box-shadow: 0 0 5px var(--red); } 50% { box-shadow: 0 0 18px var(--red); } }
            .btn-group { display: flex; flex-direction: column; gap: 12px; margin-top: 25px; }
            button { padding: 12px; border-radius: 14px; border: none; font-weight: 700; cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px; }
            .btn-open { background: #f8f9fa; color: #777; border: 1px solid #eee; }
            .btn-restart { background: var(--sakura); color: white; }
            .footer-nav { margin-top: 60px; display: flex; gap: 20px; }
            .nav-item { background: white; padding: 14px 30px; border-radius: 40px; border: 2px solid var(--sakura); color: var(--deep); font-weight: 800; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🌸 Sakura Monitor</h1>
            <p>Control Panel by <strong>Losy</strong></p>
            <div class="auth-area" onclick="login()"><i id="lock-icon" class="fas fa-lock"></i></div>
        </div>
        <div id="app" class="grid"></div>
        <div class="footer-nav">
            <div class="nav-item" onclick="handleNav('/debug')"><i class="fas fa-bug"></i> Debug & History</div>
            <div class="nav-item" onclick="handleNav('refresh')"><i class="fas fa-redo-alt"></i> Force Sync</div>
        </div>
        <script>
            let isAdmin = localStorage.getItem("sakura_key") ? true : false;
            if(isAdmin) document.getElementById('lock-icon').className = "fas fa-unlock";
            function login() {
                if(isAdmin) { if(confirm("Logout?")) { localStorage.removeItem("sakura_key"); location.reload(); } }
                else { const k = prompt("Admin Key:"); if(k){ localStorage.setItem("sakura_key", k); location.reload(); }}
            }
            function handleNav(type) {
                if(!isAdmin) return alert("Admin Credentials Required!");
                if(type === 'refresh') load();
                else window.location.href = type;
            }
            async function act(id) {
                if(!isAdmin) return alert("Admin Credentials Required!");
                const r = await fetch(\`/api/recover?id=\${id}&key=\${encodeURIComponent(localStorage.getItem("sakura_key"))}\`);
                const d = await r.json();
                alert(d.success ? "Success 🌸" : "Denied");
                load();
            }
            async function load() {
                try {
                    const res = await fetch('/api/status');
                    const data = await res.json();
                    document.getElementById('app').innerHTML = data.map(s => \`
                        <div class="card">
                            <div style="font-size:3rem; margin-bottom:15px">\${s.icon}</div>
                            <h3 style="margin:0 0 10px 0;">\${s.name}</h3>
                            <p><span class="breathing \${s.projectStatus==='online'?'br-on':'br-off'}"></span><b>PROJECT: \${s.projectStatus.toUpperCase()}</b></p>
                            <p style="font-size:0.9rem; color:#666">Monitor: \${s.displayStatus}</p>
                            <div class="btn-group">
                                <button class="btn-open" onclick="act(\${s.id})"><i class="fas fa-rocket"></i> Open Project</button>
                                <button class="btn-restart" onclick="act(\${s.id})"><i class="fas fa-sync"></i> Manual Restart</button>
                            </div>
                        </div>
                    \`).join('');
                } catch(e) {}
            }
            load(); setInterval(load, 15000);
        </script>
    </body>
    </html>
    `);
});

initSecurity();
setInterval(async () => { for (const g of guardians) await g.check(); }, CHECK_INTERVAL);
server.listen(PORT, '0.0.0.0');