const DB_URL = "https://firebasedatabase.app";
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

async function lerNuvem(telefone) {
    try {
        const res = await fetch(DB_URL + "/" + telefone + ".json");
        return await res.json();
    } catch (e) {
        return null;
    }
}

async function gravarNuvem(telefone, dados) {
    try {
        await fetch(DB_URL + "/" + telefone + ".json", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });
    } catch (e) {
        console.warn("Modo offline ativo");
    }
}

async function sincronizarComNuvem(telefone, nomeInicial) {
    const telLimpo = telefone.replace(/\D/g, '');
    const dadosExistentes = await lerNuvem(telLimpo);

    if (dadosExistentes && dadosExistentes.telefone) {
        jogadorAtual = dadosExistentes;
    } else {
        jogadorAtual = {
            telefone: telLimpo,
            nome: nomeInicial || "Participante",
            tempoRestante: TEMPO_PADRAO,
            tempoTotal: TEMPO_PADRAO,
            emAndamento: true,
            bloqueado: false,
            motivo: "",
            horaFalha: ""
        };
        await gravarNuvem(telLimpo, jogadorAtual);
    }

    sessionStorage.setItem('desafio_tel', telLimpo);
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
            ? '🏆 VENCEDOR OFICIAL DO APPLE IPHONE 11!' 
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
        btnMexeu.onclick = () => dispararBloqueioNuvem("Mexeu no telemóvel / Quebrou a regra");
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
    await gravarNuvem(jogadorAtual.telefone, jogadorAtual);
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
                gravarNuvem(jogadorAtual.telefone, jogadorAtual);
            }
        } else {
            clearInterval(intervalo);
            if (jogadorAtual.tempoRestante === 0 && !jogadorAtual.bloqueado) {
                jogadorAtual.emAndamento = false;
                await gravarNuvem(jogadorAtual.telefone, jogadorAtual);
                atualizarInterface();
                alert('🎉 TEMPO ESGOTADO! Parabéns pelo Apple iPhone 11!');
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

    const btn = document.getElementById('btn-entrar-jogo');
    btn.textContent = "A entrar...";
    btn.disabled = true;
    
    ativarEcraInteiro();
    await sincronizarComNuvem(telefone, nome);
    
    btn.textContent = "🚀 Entrar e Iniciar Contagem";
    btn.disabled = false;
};

document.getElementById('btn-desbloquear').onclick = async () => {
    const pinDigitado = document.getElementById('input-pin-admin').value;
    
    if (pinDigitado === PIN_ADMIN) {
        jogadorAtual.bloqueado = false;
        jogadorAtual.motivo = "";
        await gravarNuvem(jogadorAtual.telefone, jogadorAtual);

        document.body.classList.remove('bloqueado-ativo');
        document.getElementById('tela-penalizacao').classList.add('escondido');
        atualizarInterface();
        alert('✅ Pagamento de 5.000 Kz confirmado! Ecrã desbloqueado.');
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
    
    await gravarNuvem(jogadorAtual.telefone, jogadorAtual);
    document.getElementById('controles-admin').classList.add('escondido');
    iniciarCronometro();
    atualizarInterface();
};

document.getElementById('btn-reset').onclick = async () => {
    if (!jogadorAtual) return;
    if (confirm("Reiniciar contagem para 6 horas?")) {
        jogadorAtual.tempoTotal = TEMPO_PADRAO;
        jogadorAtual.tempoRestante = TEMPO_PADRAO;
        jogadorAtual.emAndamento = true;
        jogadorAtual.bloqueado = false;
        
        await gravarNuvem(jogadorAtual.telefone, jogadorAtual);
        document.getElementById('controles-admin').classList.add('escondido');
        iniciarCronometro();
        atualizarInterface();
    }
};

document.getElementById('btn-copiar-iban').onclick = () => {
    const texto = document.getElementById('texto-iban').textContent;
    navigator.clipboard.writeText(texto).then(() => alert('IBAN Copiado: ' + texto));
};

document.getElementById('btn-copiar-gmail').onclick = () => {
    const texto = document.getElementById('texto-gmail').textContent;
    navigator.clipboard.writeText(texto).then(() => alert('Gmail Copiado: ' + texto));
};

document.addEventListener("visibilitychange", () => {
    if (document.hidden && jogadorAtual && jogadorAtual.emAndamento && !jogadorAtual.bloqueado) {
        dispararBloqueioNuvem("Saiu do navegador ou bloqueou o ecrã!");
    }
});

const telSalvo = sessionStorage.getItem('desafio_tel');
if (telSalvo) {
    sincronizarComNuvem(telSalvo, "");
}
