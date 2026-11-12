import { initializeApp } from "https://gstatic.com";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://gstatic.com";

const firebaseConfig = {
  apiKey: "AIzaSyDDpAaWpthdTmoE64ZrmF-t8f6FF6rdMH0",
  authDomain: "://firebaseapp.com",
  databaseURL: "https://firebasedatabase.app",
  projectId: "desafio-6h-928fb",
  storageBucket: "desafio-6h-928fb.firebasestorage.app",
  messagingSenderId: "719371529545",
  appId: "1:719371529545:web:2871006770c473818b7e98"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const PIN_ADMIN = "2026";
const TEMPO_PADRAO = 21600;

let jogadorAtual = null;
let intervalo = null;

function formatarTempo(segundos) {
    const h = String(Math.floor(segundos / 3600)).padStart(2, '0');
    const m = String(Math.floor((segundos % 3600) / 60)).padStart(2, '0');
    const s = String(segundos % 60).padStart(2, '0');
    return h + ":" + m + ":" + s;
}

function ativarEcraInteiro() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
    }
}

async function sincronizarComNuvem(telefone, nomeInicial) {
    const telLimpo = telefone.replace(/\D/g, '');
    const docRef = doc(db, "participantes", telLimpo);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        jogadorAtual = docSnap.data();
    } else {
        jogadorAtual = {
            telefone: telLimpo,
            nome: nomeInicial,
            tempoRestante: TEMPO_PADRAO,
            tempoTotal: TEMPO_PADRAO,
            emAndamento: true,
            bloqueado: false,
            motivo: "",
            horaFalha: ""
        };
        await setDoc(docRef, jogadorAtual);
    }

    document.cookie = "desafio_tel=" + telLimpo + "; max-age=86400; path=/";
    document.getElementById('tela-entrada').classList.add('escondido');
    
    if (jogadorAtual.bloqueado) {
        exibirBloqueio(jogadorAtual.nome, jogadorAtual.motivo);
    } else if (jogadorAtual.emAndamento && jogadorAtual.tempoRestante > 0) {
        iniciarCronometro();
    }
    
    atualizarInterface();
}

function atualizarInterface() {
    if (!jogadorAtual) return;

    document.getElementById('cronometro').textContent = formatarTempo(jogadorAtual.tempoRestante);

    const total = jogadorAtual.tempoTotal || TEMPO_PADRAO;
    const percentagem = Math.max(0, Math.min(100, (jogadorAtual.tempoRestante / total) * 100));
    const barra = document.getElementById('barra-progresso');
    if (barra) {
        barra.style.width = percentagem + '%';
    }

    const lista = document.getElementById('lista-jogadores');
    lista.innerHTML = '';

    const li = document.createElement('li');
    if (jogadorAtual.bloqueado) {
        li.className = 'banido';
    }

    let textoStatus = '';
    if (!jogadorAtual.bloqueado) {
        textoStatus = jogadorAtual.tempoRestante === 0 
            ? '🏆 VENCEDOR OFICIAL DO IPHONE 14!' 
            : '🟢 Ligado à Nuvem (' + jogadorAtual.telefone + ') — Não saias!';
    } else {
        textoStatus = '🔒 Bloqueado na Nuvem (' + jogadorAtual.motivo + ') às ' + jogadorAtual.horaFalha;
    }

    const botaoAcao = (!jogadorAtual.bloqueado && jogadorAtual.tempoRestante > 0)
        ? '<button id="btn-mexeu-manual" class="btn-regra">🔒 Mexeu</button>'
        : '';

    li.innerHTML = '<div class="info-jogador"><strong>' + jogadorAtual.nome + '</strong><small>' + textoStatus + '</small></div>' + botaoAcao;
    lista.appendChild(li);

    const btnMexeu = document.getElementById('btn-mexeu-manual');
    if (btnMexeu) {
        btnMexeu.onclick = () => dispararBloqueioNuvem("Mexeu no telemóvel");
    }
}

async function dispararBloqueioNuvem(motivo) {
    if (!jogadorAtual || jogadorAtual.bloqueado) return;

    clearInterval(intervalo);
    jogadorAtual.emAndamento = false;
    jogadorAtual.bloqueado = true;
    jogadorAtual.motivo = motivo;
    jogadorAtual.horaFalha = formatarTempo(jogadorAtual.tempoRestante);

    exibirBloqueio(jogadorAtual.nome, motivo);
    atualizarInterface();

    const docRef = doc(db, "participantes", jogadorAtual.telefone);
    await updateDoc(docRef, {
        emAndamento: false,
        bloqueado: true,
        motivo: motivo,
        horaFalha: jogadorAtual.horaFalha,
        tempoRestante: jogadorAtual.tempoRestante
    });
}

function exibirBloqueio(nome, motivo) {
    document.body.classList.add('bloqueado-ativo');
    document.getElementById('texto-infrator').textContent = 'Infrator: ' + nome + ' (' + jogadorAtual.telefone + ')';
    document.getElementById('motivo-infrator').textContent = 'Motivo: ' + motivo;
    document.getElementById('input-pin-admin').value = '';
    document.getElementById('tela-penalizacao').classList.remove('escondido');
}

function iniciarCronometro() {
    clearInterval(intervalo);
    let contadorSync = 0;

    intervalo = setInterval(async () => {
        if (jogadorAtual.tempoRestante > 0 && !jogadorAtual.bloqueado) {
            jogadorAtual.tempoRestante--;
            atualizarInterface();

            contadorSync++;
            if (contadorSync >= 10) {
                contadorSync = 0;
                const docRef = doc(db, "participantes", jogadorAtual.telefone);
                updateDoc(docRef, { tempoRestante: jogadorAtual.tempoRestante }).catch(() => {});
            }
        } else {
            clearInterval(intervalo);
            if (jogadorAtual.tempoRestante === 0 && !jogadorAtual.bloqueado) {
                jogadorAtual.emAndamento = false;
                const docRef = doc(db, "participantes", jogadorAtual.telefone);
                await updateDoc(docRef, { tempoRestante: 0, emAndamento: false });
                atualizarInterface();
                alert('🎉 TEMPO ESGOTADO! Parabéns pelo Apple iPhone 14!');
            }
        }
    }, 1000);
}

document.getElementById('btn-entrar-jogo').onclick = async () => {
    const nome = document.getElementById('login-nome').value.trim();
    const telefone = document.getElementById('login-telefone').value.trim();

    if (!nome || telefone.length < 9) {
        alert("Insere o teu Nome e um Número de Telemóvel válido (9 dígitos)!");
        return;
    }

    document.getElementById('btn-entrar-jogo').textContent = "A verificar na nuvem...";
    ativarEcraInteiro();
    await sincronizarComNuvem(telefone, nome);
};

document.getElementById('btn-desbloquear').onclick = async () => {
    const pinDigitado = document.getElementById('input-pin-admin').value;
    
    if (pinDigitado === PIN_ADMIN) {
        jogadorAtual.bloqueado = false;
        jogadorAtual.motivo = "";
        
        const docRef = doc(db, "participantes", jogadorAtual.telefone);
        await updateDoc(docRef, {
            bloqueado: false,
            motivo: ""
        });

        document.body.classList.remove('bloqueado-ativo');
        document.getElementById('tela-penalizacao').classList.add('escondido');
        atualizarInterface();
        alert('✅ Pagamento de 5.000 Kz confirmado na Nuvem! Ecrã desbloqueado.');
    } else {
        alert('❌ PIN incorreto! Transfere os 5.000 Kz e envia o comprovativo para andersonemilio55@gmail.com.');
        document.getElementById('input-pin-admin').value = '';
    }
};

document.getElementById('btn-abrir-admin').onclick = () => {
    if (jogadorAtual && jogadorAtual.bloqueado) return;
    const pin = prompt("PIN de Administrador:");
    if (pin === PIN_ADMIN) {
        document.getElementById('controles-admin').classList.remove('escondido');
    } else if (pin !== null) {
        alert("❌ PIN incorreto.");
    }
};

document.getElementById('btn-fechar-admin').onclick = () => {
    document.getElementById('controles-admin').classList.add('escondido');
};

document.getElementById('btn-teste').onclick = async () => {
    if (!jogadorAtual) return;
    jogadorAtual.tempoTotal = 10;
    jogadorAtual.tempoRestante = 10;
    jogadorAtual.emAndamento = true;
    jogadorAtual.bloqueado = false;
    
    const docRef = doc(db, "participantes", jogadorAtual.telefone);
    await updateDoc(docRef, { 
        tempoTotal: 10, 
        tempoRestante: 10, 
        emAndamento: true, 
        bloqueado: false 
    });
    
    document.getElementById('controles-admin').classList.add('escondido');
    iniciarCronometro();
    atualizarInterface();
};

document.getElementById('btn-reset').onclick = async () => {
    if (!jogadorAtual) return;
    if (confirm("Reiniciar contagem para 6 horas na nuvem?")) {
        jogadorAtual.tempoTotal = TEMPO_PADRAO;
        jogadorAtual.tempoRestante = TEMPO_PADRAO;
        jogadorAtual.emAndamento = true;
        jogadorAtual.bloqueado = false;
        
        const docRef = doc(db, "participantes", jogadorAtual.telefone);
        await updateDoc(docRef, { 
            tempoTotal: TEMPO_PADRAO, 
            tempoRestante: TEMPO_PADRAO, 
            emAndamento: true, 
            bloqueado: false 
        });
        
        document.getElementById('controles-admin').classList.add('escondido');
        iniciarCronometro();
        atualizarInterface();
    }
};

document.getElementById('btn-copiar-iban').onclick = () => {
    const texto = document.getElementById('texto-iban').textContent;
    navigator.clipboard.writeText(texto).then(() => {
        alert('IBAN Copiado: ' + texto);
    });
};

document.getElementById('btn-copiar-gmail').onclick = () => {
    const texto = document.getElementById('texto-gmail').textContent;
    navigator.clipboard.writeText(texto).then(() => {
        alert('Gmail Copiado: ' + texto);
    });
};

document.addEventListener("visibilitychange", () => {
    if (document.hidden && jogadorAtual && jogadorAtual.emAndamento && !jogadorAtual.bloqueado) {
        dispararBloqueioNuvem("Saiu do navegador ou bloqueou o ecrã!");
    }
});

