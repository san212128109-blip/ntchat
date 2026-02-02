let peer, conn, lStream, mediaRec, chunks = [], activeCall;
const ring = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3');

function auth() {
    const val = document.getElementById('pw').value;
    if(val === "1234") {
        document.getElementById('login').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        init();
    } else if(val === "4321") {
        document.getElementById('login').style.display = 'none';
        document.getElementById('flag-page').style.display = 'flex';
    } else { alert("Incorrect Code!"); }
}

function init() {
    let id = localStorage.getItem('s_pid') || Math.random().toString(36).substring(2,6).toUpperCase();
    localStorage.setItem('s_pid', id);
    peer = new Peer(id);
    peer.on('open', (myId) => { document.getElementById('p-status').innerText = "ID: " + myId; });
    peer.on('connection', c => { conn = c; handleConn(); });
    peer.on('call', call => {
        ring.play();
        if(confirm("Answer Call?")) {
            ring.pause();
            navigator.mediaDevices.getUserMedia({audio:true}).then(s => {
                activeCall = call; lStream = s;
                document.getElementById('call-ui').style.display = 'flex';
                call.answer(s);
                call.on('stream', rs => { const a = new Audio(); a.srcObject = rs; a.play(); });
                call.on('close', () => hangupUI());
            });
        } else { ring.pause(); }
    });
}

function link() {
    let tid = document.getElementById('fid').value.toUpperCase();
    if(tid) { conn = peer.connect(tid); handleConn(); }
}

function handleConn() {
    conn.on('open', () => { document.getElementById('p-status').innerText = "Online ✅"; });
    conn.on('data', d => { if(d.v) addAudio(d.v, 'fr'); else addMsg(d, 'fr'); });
}

function send() {
    let i = document.getElementById('m-in');
    if(conn && conn.open && i.value) {
        conn.send(i.value);
        addMsg(i.value, 'my');
        i.value = "";
    }
}

// Voice Recorder Logic
const vBtn = document.getElementById('v-btn');
['mousedown', 'touchstart'].forEach(e => vBtn.addEventListener(e, (ev) => { ev.preventDefault(); startV(); }));
['mouseup', 'touchend'].forEach(e => vBtn.addEventListener(e, (ev) => { ev.preventDefault(); stopV(); }));

async function startV() {
    try {
        lStream = await navigator.mediaDevices.getUserMedia({audio:true});
        mediaRec = new MediaRecorder(lStream);
        chunks = [];
        mediaRec.ondataavailable = e => chunks.push(e.data);
        mediaRec.start();
        vBtn.style.background = "#ea4335";
    } catch(e) { console.error(e); }
}

function stopV() {
    if(!mediaRec || mediaRec.state === "inactive") return;
    mediaRec.stop();
    vBtn.style.background = "#54656f";
    mediaRec.onstop = () => {
        const blob = new Blob(chunks, {type: 'audio/webm'});
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => { if(conn && conn.open) { conn.send({v: reader.result}); addAudio(reader.result, 'my'); } };
        lStream.getTracks().forEach(t => t.stop());
    };
}

function makeCall() {
    let tid = document.getElementById('fid').value.toUpperCase();
    navigator.mediaDevices.getUserMedia({audio:true}).then(s => {
        lStream = s;
        activeCall = peer.call(tid, s);
        document.getElementById('call-ui').style.display = 'flex';
        activeCall.on('stream', rs => { const a = new Audio(); a.srcObject = rs; a.play(); });
        activeCall.on('close', () => hangupUI());
    });
}

function hangup() { if(activeCall) activeCall.close(); ring.pause(); hangupUI(); }
function hangupUI() { document.getElementById('call-ui').style.display = 'none'; }

function addMsg(m, c) {
    let d = document.createElement('div'); d.className = `msg ${c}`; d.innerText = m;
    const cb = document.getElementById('chat-box'); cb.appendChild(d); cb.scrollTop = cb.scrollHeight;
}

function addAudio(b, c) {
    let d = document.createElement('div'); d.className = `msg ${c}`;
    let a = document.createElement('audio'); a.controls = true; a.src = b; a.style.width = "180px";
    d.appendChild(a);
    const cb = document.getElementById('chat-box'); cb.appendChild(d); cb.scrollTop = cb.scrollHeight;
}
