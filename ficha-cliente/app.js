/* Decisões da ficha do cliente: um envio para a página toda, reenvio vale o último. */
(function () {
  'use strict';
  var P = window.Pagina, h = P.h;
  var SLUG = 'ficha-cliente-2026-10';
  var ITEM = 'ficha';
  var raiz = document.getElementById('raiz');
  var chave = P.chaveDoLink();
  var RESPOSTAS = [['concordo', 'Concordo'], ['outra', 'Prefiro outra coisa'], ['conversar', 'Preciso conversar']];
  var CHAVE_NOME = 'hw-pag-nome';
  var CHAVE_RASC = 'hw-pag:' + SLUG + ':' + ITEM;
  var QUEM = { vitor: 'Decisão do Vitor; a sua opinião conta.', ambos: 'Decisão sua e do Vitor.' };

  function iniciar() {
    raiz.textContent = '';
    raiz.appendChild(h('p', { class: 'carregando' }, 'Carregando…'));
    P.carregar(SLUG, chave).then(function (r) {
      if (r.estado !== 'ok') return P.falhaDeCarga(raiz, r, iniciar);
      montar(r.conteudo, r.respostas[ITEM]);
    });
  }

  function seg(nome, legenda, opcoes, valor, aoMudar, classe) {
    var f = h('fieldset', { class: 'seg ' + (classe || '') }, h('legend', null, legenda));
    opcoes.forEach(function (o) {
      var inp = h('input', { type: 'radio', name: nome, value: o[0], checked: valor === o[0] });
      inp.addEventListener('change', function () { aoMudar(o[0]); });
      f.appendChild(h('label', null, inp, h('span', null, o[1])));
    });
    return f;
  }

  function num(v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : n; }

  function montar(c, envio) {
    var rasc = P.lerJson(CHAVE_RASC);
    var base = (rasc && rasc.payload) || (envio && envio.payload) || {};
    var enviadoEm = envio ? envio.criado_em : null;
    var sujo = !!rasc;

    var st = { r: {}, pesos: {}, cortes: {}, anc: {} };
    c.decisoes.forEach(function (d) {
      var b = (base.respostas && base.respostas[d.id]) || {};
      st.r[d.id] = { r: b.r || null, texto: b.texto || '', comentario: b.comentario || '' };
    });
    c.saude.fatores.forEach(function (f) {
      var p = base.saude && base.saude.pesos && base.saude.pesos[f.id];
      st.pesos[f.id] = typeof p === 'number' ? p : f.peso;
    });
    st.cortes.saudavel = (base.saude && base.saude.cortes && base.saude.cortes.saudavel) || c.saude.cortes.saudavel;
    st.cortes.atencao = (base.saude && base.saude.cortes && base.saude.cortes.atencao) || c.saude.cortes.atencao;
    ['n1', 'n3', 'n5'].forEach(function (k) { st.anc[k] = (base.d7 && base.d7[k]) || ''; });

    var nomeInp = h('input', { class: 'entrada', id: 'nome', type: 'text', maxlength: 120, autocomplete: 'name', value: P.lerLocal(CHAVE_NOME) || 'Luciana' });
    nomeInp.addEventListener('input', function () { P.gravarLocal(CHAVE_NOME, nomeInp.value); });

    var estado = h('div', { class: 'estado', role: 'status' });
    var botao = h('button', { class: 'btn', type: 'button' });
    var contagem = h('span');

    function respondidas() { return c.decisoes.filter(function (d) { return st.r[d.id].r; }); }
    function pintar(tipo, filhos, tentar) {
      estado.textContent = '';
      estado.className = 'estado' + (tipo ? ' ' + tipo : '');
      if (tipo === 'ok') estado.appendChild(P.icone('check'));
      if (tipo === 'erro') estado.appendChild(P.icone('alerta'));
      if (filhos) estado.appendChild(h('span', null, filhos));
      if (tentar) estado.appendChild(h('button', { class: 'btn-texto', type: 'button', onclick: tentar }, 'Tentar de novo'));
    }
    function links(lista) {
      var out = [];
      lista.forEach(function (d, i) {
        if (i) out.push(i === lista.length - 1 ? ' e ' : ', ');
        out.push(h('a', { href: '#d-' + d.id }, d.id));
      });
      return out;
    }
    function estadoAtual() {
      var falta = c.decisoes.filter(function (d) { return !st.r[d.id].r; });
      var resumo = respondidas().length + ' de ' + c.decisoes.length + ' respondidas';
      contagem.textContent = resumo;
      botao.textContent = enviadoEm ? 'Reenviar respostas' : 'Enviar respostas';
      if (enviadoEm && sujo) pintar('', 'Há alterações ainda não enviadas.');
      else if (enviadoEm) pintar('ok', ['Enviado ' + P.hora(enviadoEm) + '. ' + (falta.length ? 'Faltam ' : 'Todas respondidas.'), falta.length ? links(falta) : null, falta.length ? '. ' : ' ', 'Dá para alterar e reenviar; vale o último envio.']);
      else pintar('', '');
    }
    function pesosPayload() { var o = {}; c.saude.fatores.forEach(function (f) { o[f.id] = st.pesos[f.id]; }); return o; }
    function soma() { return c.saude.fatores.reduce(function (a, f) { return a + st.pesos[f.id]; }, 0); }
    function payload() {
      var resp = {};
      c.decisoes.forEach(function (d) {
        var r = st.r[d.id];
        if (r.r || r.comentario.trim()) resp[d.id] = { r: r.r, texto: r.r === 'outra' ? r.texto.trim() : '', comentario: r.comentario.trim() };
      });
      var alterado = c.saude.fatores.some(function (f) { return st.pesos[f.id] !== f.peso; }) ||
        st.cortes.saudavel !== c.saude.cortes.saudavel || st.cortes.atencao !== c.saude.cortes.atencao;
      return {
        respostas: resp,
        saude: { pesos: pesosPayload(), soma: soma(), cortes: { saudavel: st.cortes.saudavel, atencao: st.cortes.atencao }, alterado_do_rascunho: alterado },
        d7: { n1: st.anc.n1.trim(), n3: st.anc.n3.trim(), n5: st.anc.n5.trim() }
      };
    }
    function alterou() {
      sujo = true;
      P.gravarLocal(CHAVE_RASC, JSON.stringify({ payload: payload() }));
      estadoAtual();
    }

    // ---- D1: pesos e cortes
    var somaEl = h('p', { class: 'soma', role: 'status' });
    var riscoEl = h('p', { class: 'risco' });
    var primeiroPeso = null;
    function pintarSoma() {
      var s = soma();
      somaEl.textContent = '';
      somaEl.className = 'soma ' + (s === 100 ? 'ok' : 'erro');
      somaEl.appendChild(P.icone(s === 100 ? 'check' : 'alerta'));
      somaEl.appendChild(h('span', null, s === 100 ? 'Soma: 100 de 100' : 'Soma: ' + s + '. Os pesos precisam somar 100.'));
    }
    function pintarRisco() { riscoEl.textContent = 'Risco: abaixo de ' + st.cortes.atencao; }

    function blocoSaude() {
      var bloco = h('div', { class: 'saude' });
      c.saude.fatores.forEach(function (f, i) {
        var id = 'peso-' + f.id;
        var inp = h('input', { class: 'entrada num', id: id, type: 'number', inputmode: 'numeric', min: 0, max: 100, step: 1, value: st.pesos[f.id], 'aria-describedby': id + '-como' });
        if (!i) primeiroPeso = inp;
        inp.addEventListener('input', function () { st.pesos[f.id] = num(inp.value); pintarSoma(); alterou(); });
        bloco.appendChild(h('div', { class: 'fator' },
          h('div', { class: 'fator-nome' }, h('label', { for: id }, f.nome)),
          h('div', { class: 'fator-peso' }, inp, h('span', { class: 'un' }, 'pontos')),
          h('p', { class: 'fator-como', id: id + '-como' }, f.como)));
      });
      pintarSoma();
      bloco.appendChild(somaEl);
      bloco.appendChild(h('ul', { class: 'regras' }, c.saude.regras.map(function (t) { return h('li', null, t); })));
      var sa = h('input', { class: 'entrada', id: 'corte-saudavel', type: 'number', inputmode: 'numeric', min: 1, max: 100, step: 1, value: st.cortes.saudavel });
      var at = h('input', { class: 'entrada', id: 'corte-atencao', type: 'number', inputmode: 'numeric', min: 1, max: 100, step: 1, value: st.cortes.atencao });
      sa.addEventListener('input', function () { st.cortes.saudavel = num(sa.value); alterou(); });
      at.addEventListener('input', function () { st.cortes.atencao = num(at.value); pintarRisco(); alterou(); });
      pintarRisco();
      bloco.appendChild(h('div', { class: 'cortes' },
        h('div', null, h('label', { class: 'rotulo', for: 'corte-saudavel' }, 'Saudável a partir de'), sa),
        h('div', null, h('label', { class: 'rotulo', for: 'corte-atencao' }, 'Atenção a partir de'), at),
        riscoEl));
      bloco.corteInputs = [sa, at];
      return bloco;
    }

    // ---- D7: níveis 1, 3 e 5
    function blocoAncoras() {
      var itens = [['n1', 'Nível 1'], ['n3', 'Nível 3'], ['n5', 'Nível 5']];
      return h('div', { class: 'ancoras' }, itens.map(function (it) {
        var id = 'anc-' + it[0];
        var ta = h('input', { class: 'entrada', id: id, type: 'text', maxlength: 300, autocomplete: 'off', value: st.anc[it[0]] });
        ta.addEventListener('input', function () { st.anc[it[0]] = ta.value; alterou(); });
        return h('div', null, h('label', { class: 'rotulo', for: id }, it[1], ' ', h('span', { class: 'opc' }, '(uma linha)')), ta);
      }));
    }

    // ---- uma decisão
    var blocosSaude = null;
    function decisao(d) {
      var r = st.r[d.id];
      var idd = 'd-' + d.id;
      var outraTa = h('textarea', { class: 'entrada', id: idd + '-outra', maxlength: 1500, rows: 3 });
      outraTa.value = r.texto;
      var outraWrap = h('div', { class: 'resp-extra' }, h('label', { class: 'rotulo', for: idd + '-outra' }, 'O que você prefere?'), outraTa, h('p', { class: 'aviso-campo', hidden: true }, 'Conte o que você prefere.'));
      var comTa = h('textarea', { class: 'entrada', id: idd + '-com', maxlength: 1500, rows: 3 });
      comTa.value = r.comentario;
      var comAberto = false;
      var comWrap = h('div', { class: 'resp-extra' }, h('label', { class: 'rotulo', for: idd + '-com' }, 'Comentário ', h('span', { class: 'opc' }, '(opcional)')), comTa);
      var comBtn = h('button', { class: 'btn-texto', type: 'button' }, P.icone('mais'), 'Adicionar comentário');
      function sync() {
        outraWrap.hidden = r.r !== 'outra';
        var mostra = comAberto || !!comTa.value;
        comWrap.hidden = !mostra;
        comBtn.hidden = mostra;
      }
      comBtn.addEventListener('click', function () { comAberto = true; sync(); comTa.focus(); });
      comTa.addEventListener('input', function () { r.comentario = comTa.value; alterou(); });
      outraTa.addEventListener('input', function () { r.texto = outraTa.value; outraWrap.lastChild.hidden = true; alterou(); });
      var grupo = seg('r-' + d.id, d.id + ': ' + d.titulo + ', sua resposta', RESPOSTAS, r.r, function (v) { r.r = v; sync(); alterou(); }, 'resp-seg');
      sync();

      var extra = null;
      if (d.especial === 'saude') extra = blocosSaude = blocoSaude();
      if (d.especial === 'ancoras') extra = blocoAncoras();

      return h('section', { class: 'decisao', id: idd, 'aria-labelledby': idd + '-t' },
        h('h2', { id: idd + '-t' }, h('span', { class: 'id' }, d.id), d.titulo),
        QUEM[d.decide] ? h('p', { class: 'de-quem' }, QUEM[d.decide]) : null,
        h('p', { class: 'enunciado' }, d.enunciado),
        h('div', { class: 'reco' }, h('h3', { class: 'rotulo' }, 'Recomendação'), h('p', null, d.recomendacao)),
        extra,
        h('div', { class: 'resp' }, h('p', { class: 'rotulo', 'aria-hidden': 'true' }, 'Sua resposta'), grupo, outraWrap, comBtn, comWrap));
    }

    function enviar() {
      var nome = nomeInp.value.trim();
      if (!nome) { pintar('erro', 'Escreva o seu nome no começo da página.'); nomeInp.focus(); return; }
      if (soma() !== 100) {
        pintar('erro', ['Os pesos da saúde somam ' + soma() + ', precisam somar 100 (', h('a', { href: '#d-D1' }, 'D1'), ').']);
        primeiroPeso.scrollIntoView({ block: 'center' }); primeiroPeso.focus(); return;
      }
      var cs = st.cortes;
      if (!(cs.saudavel >= 1 && cs.saudavel <= 100 && cs.atencao >= 1 && cs.atencao <= 100 && cs.saudavel > cs.atencao)) {
        pintar('erro', ['Nos cortes da saúde, “Saudável” precisa ser maior que “Atenção”, entre 1 e 100 (', h('a', { href: '#d-D1' }, 'D1'), ').']);
        blocosSaude.corteInputs[0].scrollIntoView({ block: 'center' }); blocosSaude.corteInputs[0].focus(); return;
      }
      var semTexto = c.decisoes.filter(function (d) { return st.r[d.id].r === 'outra' && !st.r[d.id].texto.trim(); });
      if (semTexto.length) {
        pintar('erro', ['Conte o que você prefere em ', links(semTexto), '.']);
        var el = document.getElementById('d-' + semTexto[0].id + '-outra');
        el.parentNode.lastChild.hidden = false; el.scrollIntoView({ block: 'center' }); el.focus(); return;
      }
      if (!respondidas().length) { pintar('erro', 'Responda ao menos uma decisão antes de enviar.'); return; }
      botao.disabled = true;
      pintar('', 'Enviando…');
      P.enviar(SLUG, chave, ITEM, payload(), nome).then(function (r) {
        botao.disabled = false;
        if (r.estado === 'ok') {
          enviadoEm = r.criado_em || new Date().toISOString();
          sujo = false;
          P.apagarLocal(CHAVE_RASC);
          estadoAtual();
        } else if (r.estado === 'negado') pintar('erro', 'O link não é mais válido. Peça um novo ao Vitor.');
        else if (r.estado === 'recusado') pintar('erro', 'O envio foi recusado' + (r.motivo ? ' (' + r.motivo + ')' : '') + '. Confira os textos.');
        else pintar('erro', 'Não foi possível enviar. Confira a conexão.', enviar);
      });
    }
    botao.addEventListener('click', enviar);

    raiz.textContent = '';
    raiz.appendChild(h('header', null,
      h('p', { class: 'marca' }, 'Hywork'),
      h('h1', null, c.titulo),
      h('p', { class: 'intro' }, c.intro)));
    raiz.appendChild(h('div', { class: 'quem' }, h('label', { class: 'rotulo', for: 'nome' }, 'Seu nome'), nomeInp));
    c.decisoes.forEach(function (d) { raiz.appendChild(decisao(d)); });
    raiz.appendChild(h('div', { class: 'rodape' }, botao, h('p', { class: 'estado' }, contagem), estado));
    estadoAtual();
  }

  iniciar();
})();
