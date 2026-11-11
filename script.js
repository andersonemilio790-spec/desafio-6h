const PIN_ADMIN = "2026";
const TEMPO_PADRAO = 6 * 3600;
const VALOR_PREMIO = 5000;

let estado = JSON.parse(localStorage.getItem('desafio6h_dados')) || {
    tempoRestante: TEMPO_PADRAO,
    emAndamento: false,
    jogadores: [],
    bloqueioAtivo: null
};

let intervalo = null;

function salvarEstado() {
    localStorage.setItem('desafio6h_dados', JSON.stringify(estado));
}

function formatarTempo(segundos) {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

function ativarEcraInteiro() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    }
}

function atualizarInterface() {
    document.getElementById('cronometro').textContent = formatarTempo(estado.tempoRestante);
    document.getElementById('btn-iniciar').disabled = estado.emAndamento || estado.tempoRestante === 0;
    document.getElementById('btn-teste').disabled = estado.emAndamento || estado.tempoRestante === 0;

    const lista = document.getElementById('lista-jogadores');
    lista.innerHTML = '';

    let ativos = 0;

    estado.jogadores.forEach((jogador, index) => {
        if (jogador.status === 'ativo') {
            ativos++;
        }

        const li = document.createElement('li');
        if (jogador.status === 'banido') li.className = 'banido';

        let textoStatus = '';
        if (jogador.status === 'ativo') {
            textoStatus = estado.tempoRestante === 0 
                ? `🏆 VENCEDOR! Ganhou ${VALOR_PREMIO.toLocaleString('pt-PT')} Kz` 
                : `🟢 A disputar o prémio de ${VALOR_PREMIO.toLocaleString('pt-PT')} Kz`;
        } else if (jogador.status === 'banido') {
            textoStatus = `🔒 Eliminado (${jogador.motivo}) às ${jogador.horaFalha}`;
        }

        const botoesAcao = (jogador.status === 'ativo' && estado.tempoRestante > 0) 
            ? `<div class="acoes-jogador">
                <button class="btn-regra" onclick="registrarInfracao(${index})">🔒 Mexeu / Bloquear</button>
               </div>` 
            : '';

        li.innerHTML = `
            <div class="info-jogador">
                <strong>${jogador.nome}</strong>
                <small>${textoStatus}</small>
            </div>
            ${botoesAcao}
        `;
        lista.appendChild(li);
    });

    document.getElementById('total-ativos').textContent = ativos;
}

function adicionarJogador() {
    if (estado.emAndamento) {
        alert('O desafio já começou! Não é possível adicionar novos participantes.');
        return;
    }

    const input = document.getElementById('input-nome');
    const nome = input.value.trim();
    if (!nome) return;

    estado.jogadores.push({
        nome: nome,
        status: 'ativo',
        horaFalha: null,
        motivo: ''
    });

    input.value = '';
    salvarEstado();
    atualizarInterface();
}

function iniciarCronometro() {
    clearInterval(intervalo);
    intervalo = setInterval(() => {
        if (estado.tempoRestante > 0) {
            estado.tempoRestante--;
            salvarEstado();
            atualizarInterface();
        } else {
            clearInterval(intervalo);
            estado.emAndamento = false;
            salvarEstado();
            atualizarInterface();
            alert('🎉 TEMPO ESGOTADO! Os vencedores ganharam 5.000 Kz!');
        }
    }, 1000);
}

function iniciarDesafio() {
    if (estado.jogadores.length === 0) {
        alert('Adiciona pelo menos um participante antes de iniciar!');
        return;
    }
    ativarEcraInteiro();
    estado.emAndamento = true;
    salvarEstado();
    atualizarInterface();
    iniciarCronometro();
}

function ativarModoTeste() {
    if (estado.jogadores.length === 0) {
        alert('Adiciona pelo menos um participante para testar!');
        return;
    }
    estado.tempoRestante = 10;
    iniciarDesafio();
}

function registrarInfracao(index) {
    if (!estado.emAndamento) {
        alert('Inicia o cronómetro primeiro!');
        return;
    }

    const jogador = estado.jogadores[index];
    jogador.status = 'banido';
    jogador.motivo = 'Mexeu no telemóvel / Quebrou a regra';
    jogador.horaFalha = formatarTempo(estado.tempoRestante);
    
    salvarEstado();
    atualizarInterface();
    abrirTelaPenalizacao(jogador.nome, jogador.motivo);
}

function abrirTelaPenalizacao(nome, motivo) {
    estado.bloqueioAtivo = { nome: nome, motivo: motivo };
    salvarEstado();

    document.getElementById('texto-infrator').textContent = `Infrator: ${nome}`;
    document.getElementById('motivo-infrator').textContent = `Motivo: ${motivo}`;
    document.getElementById('input-pin-admin').value = '';
    document.getElementById('tela-penalizacao').classList.remove('escondido');
}

function desbloquearComPin() {
    const pinDigitado = document.getElementById('input-pin-admin').value;
    
    if (pinDigitado === PIN_ADMIN) {
        estado.bloqueioAtivo = null;
        salvarEstado();
        document.getElementById('tela-penalizacao').classList.add('escondido');
        alert('✅ Pagamento de 5.000 Kz confirmado! Ecrã desbloqueado.');
    } else {
        alert('❌ PIN incorreto! Transfere os 5.000 Kz e envia o comprovativo para andersonemilio55@gmail.com.');
        document.getElementById('input-pin-admin').value = '';
    }
}

function copiarTexto(idElemento) {
    const texto = document.getElementById(idElemento).textContent;
    navigator.clipboard.writeText(texto).then(() => {
        alert('Copiado: ' + texto);
    });
}

function reiniciarTudo() {
    if (confirm('Tens a certeza que queres apagar tudo e reiniciar para 6 horas?')) {
        clearInterval(intervalo);
        estado = {
            tempoRestante: TEMPO_PADRAO,
            emAndamento: false,
            jogadores: [],
            bloqueioAtivo: null
        };
        salvarEstado();
        atualizarInterface();
    }
}

document.addEventListener("visibilitychange", () => {
    if (document.hidden && estado.emAndamento && !estado.bloqueioAtivo) {
        estado.emAndamento = false;
        clearInterval(intervalo);
        
        abrirTelaPenalizacao(
            "Participante", 
            "Saiu da página ou bloqueou o ecrã durante o desafio!"
        );
    }
});

if (estado.emAndamento && estado.tempoRestante > 0) {
    iniciarCronometro();
}

if (estado.bloqueioAtivo) {
    abrirTelaPenalizacao(estado.bloqueioAtivo.nome, estado.bloqueioAtivo.motivo);
}

atualizarInterface();
