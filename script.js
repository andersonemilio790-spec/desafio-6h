const PIN_ADMIN = "2026"; // Tua senha secreta para desbloquear após veres o comprovativo
const TEMPO_PADRAO = 6 * 3600;
const VALOR_PREMIO = 5000;
const VALOR_MULTA = 2500;
const VALOR_DESBLOQUEIO = 5000;

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
    let totalArrecadado = 0;
    let premios = 0;

    estado.jogadores.forEach((jogador, index) => {
        if (jogador.status === 'ativo') {
            ativos++;
            if (estado.tempoRestante === 0) {
                premios += VALOR_PREMIO;
            }
        } else if (jogador.status === 'mexeu') {
            totalArrecadado += VALOR_MULTA;
        } else if (jogador.status === 'banido') {
            totalArrecadado += VALOR_DESBLOQUEIO;
        }

        const li = document.createElement('li');
        if (jogador.status === 'mexeu') li.className = 'eliminado';
        if (jogador.status === 'banido') li.className = 'banido';

        let textoStatus = '';
        if (jogador.status === 'ativo') {
            textoStatus = estado.tempoRestante === 0 
                ? `🏆 Vencedor! Recebe ${VALOR_PREMIO.toLocaleString('pt-PT')} Kz` 
                : '🟢 Resistindo sem telemóvel';
        } else if (jogador.status === 'mexeu') {
            textoStatus = `❌ Mexeu às ${jogador.horaFalha} (Paga ${VALOR_MULTA.toLocaleString('pt-PT')} Kz)`;
        } else if (jogador.status === 'banido') {
            textoStatus = `🔒 Bloqueado (${jogador.motivo}) às ${jogador.horaFalha} (Desbloqueio: ${VALOR_DESBLOQUEIO.toLocaleString('pt-PT')} Kz)`;
        }

        const botoesAcao = (jogador.status === 'ativo' && estado.tempoRestante > 0) 
            ? `<div class="acoes-jogador">
                <button class="btn-mexeu" onclick="registrarFalha(${index})">Mexeu!</button>
                <button class="btn-regra" onclick="registrarInfracao(${index})" title="Bloquear por quebra de regra">🔒 Bloquear</button>
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
    document.getElementById('total-multas').textContent = totalArrecadado.toLocaleString('pt-PT') + ' Kz';
    document.getElementById('total-premios').textContent = premios.toLocaleString('pt-PT') + ' Kz';
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
            alert('🎉 TEMPO ESGOTADO! Todos os que resistiram ganharam 5.000 Kz!');
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

function registrarFalha(index) {
    if (!estado.emAndamento) {
        alert('Inicia o cronómetro primeiro!');
        return;
    }

    const jogador = estado.jogadores[index];
    if (confirm(`Confirmas que ${jogador.nome} mexeu no telemóvel e vai pagar 2.500 Kz?`)) {
        jogador.status = 'mexeu';
        jogador.horaFalha = formatarTempo(estado.tempoRestante);
        salvarEstado();
        atualizarInterface();
    }
}

function registrarInfracao(index) {
    if (!estado.emAndamento) {
        alert('Inicia o cronómetro primeiro!');
        return;
    }

    const jogador = estado.jogadores[index];
    const motivo = prompt(`Qual regra ${jogador.nome} quebrou? (Ex: Saiu da tela, recusou pagar, batota)`);
    
    if (motivo !== null && motivo.trim() !== '') {
        jogador.status = 'banido';
        jogador.motivo = motivo.trim();
        jogador.horaFalha = formatarTempo(estado.tempoRestante);
        
        salvarEstado();
        atualizarInterface();
        abrirTelaPenalizacao(jogador.nome, jogador.motivo);
    }
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

// DETEÇÃO AUTOMÁTICA SE SAIR DO NAVEGADOR OU BLOQUEAR O TELEMÓVEL
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

// Recupera o estado caso a página seja atualizada
if (estado.emAndamento && estado.tempoRestante > 0) {
    iniciarCronometro();
}

if (estado.bloqueioAtivo) {
    abrirTelaPenalizacao(estado.bloqueioAtivo.nome, estado.bloqueioAtivo.motivo);
}

atualizarInterface();
