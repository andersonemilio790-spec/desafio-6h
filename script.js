const PIN_ADMIN = "2026"; // Muda este número para a tua senha secreta
const TEMPO_PADRAO = 6 * 3600; // 6 horas em segundos
const VALOR_PREMIO = 5000;
const VALOR_MULTA = 2500;
const VALOR_INFRACAO = 5000;

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
            totalArrecadado += VALOR_INFRACAO;
        }

        const li = document.createElement('li');
        if (jogador.status === 'mexeu') li.className = 'eliminado';
        if (jogador.status === 'banido') li.className = 'banido';

        let textoStatus = '';
        if (jogador.status === 'ativo') {
            textoStatus = estado.tempoRestante === 0 
                ? `🏆 Vencedor! Recebe ${VALOR_PREMIO.toLocaleString('pt-PT')}` 
                : '🟢 Resistindo sem telemóvel';
        } else if (jogador.status === 'mexeu') {
            textoStatus = `❌ Mexeu às ${jogador.horaFalha} (Paga ${VALOR_MULTA.toLocaleString('pt-PT')})`;
        } else if (jogador.status === 'banido') {
            textoStatus = `🚫 Quebrou regra (${jogador.motivo}) às ${jogador.horaFalha} (Paga ${VALOR_INFRACAO.toLocaleString('pt-PT')})`;
        }

        const botoesAcao = (jogador.status === 'ativo' && estado.tempoRestante > 0) 
            ? `<div class="acoes-jogador">
                <button class="btn-mexeu" onclick="registrarFalha(${index})">Mexeu!</button>
                <button class="btn-regra" onclick="registrarInfracao(${index})" title="Quebrou as regras">🚫 Regra</button>
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
    document.getElementById('total-multas').textContent = totalArrecadado.toLocaleString('pt-PT');
    document.getElementById('total-premios').textContent = premios.toLocaleString('pt-PT');
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
            alert('🎉 TEMPO ESGOTADO! Todos os que resistiram ganharam 5.000!');
        }
    }, 1000);
}

function iniciarDesafio() {
    if (estado.jogadores.length === 0) {
        alert('Adiciona pelo menos um participante antes de iniciar!');
        return;
    }
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
    if (confirm(`Confirmas que ${jogador.nome} mexeu no telemóvel e vai pagar 2.500?`)) {
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
    const motivo = prompt(`Qual regra ${jogador.nome} quebrou? (Ex: Mexeu às escondidas, recusou pagar, etc.)`);
    
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
        alert('✅ Pagamento confirmado! Ecrã desbloqueado.');
    } else {
        alert('❌ PIN incorreto! Envia o comprovativo para o Gmail primeiro.');
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

// Recupera o estado caso a página seja atualizada
if (estado.emAndamento && estado.tempoRestante > 0) {
    iniciarCronometro();
}

if (estado.bloqueioAtivo) {
    abrirTelaPenalizacao(estado.bloqueioAtivo.nome, estado.bloqueioAtivo.motivo);
}

atualizarInterface();
