/* Avaliação do briefing de handover: uma venda por envio, reenvio vale o último. */
(function () {
  'use strict';
  var P = window.Pagina, h = P.h;
  var SLUG = 'briefing-handover-2026-10';
  var raiz = document.getElementById('raiz');
  var chave = P.chaveDoLink();
  var ESCALA = [['C', 'Certo', 'sel-ok'], ['E', 'Errado', 'sel-erro'], ['I', 'Incompleto', 'sel-aviso']];
  var NOTAS = [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']];
  var CHAVE_NOME = 'hw-pag-nome';

  function iniciar() {
    raiz.textContent = '';
    raiz.appendChild(h('p', { class: 'carregando' }, 'Carregando…'));
    P.carregar(SLUG, chave).then(function (r) {
      if (r.estado !== 'ok') return P.falhaDeCarga(raiz, r, iniciar);
      montar(r.conteudo, r.respostas);
    });
  }

  function seg(nome, legenda, opcoes, valor, aoMudar, classe) {
    var f = h('fieldset', { class: 'seg ' + (classe || '') }, h('legend', null, legenda));
    opcoes.forEach(function (o) {
      var inp = h('input', { type: 'radio', name: nome, value: o[0], checked: valor === o[0] });
      inp.addEventListener('change', function () { aoMudar(o[0]); });
      f.appendChild(h('label', { class: o[2] || '' }, inp, h('span', null, o[1])));
    });
    return f;
  }

  function montar(c, respostas) {
    var nomeInp = h('input', { class: 'entrada', id: 'nome', type: 'text', maxlength: 120, autocomplete: 'name', value: P.lerLocal(CHAVE_NOME) || 'Luciana' });
    nomeInp.addEventListener('input', function () { P.gravarLocal(CHAVE_NOME, nomeInp.value); });

    var vendas = {};      // id -> {venda, st, enviadoEm, sujo, estadoIndice, atualizarEstado}
    var contagem = h('span');
    var indice = h('ul', { class: 'indice' });

    function atualizarContagem() {
      var n = Object.keys(vendas).filter(function (id) { return vendas[id].enviadoEm; }).length;
      contagem.textContent = n + ' de ' + c.vendas.length + ' enviadas';
    }

    var secoes = c.vendas.map(function (v) {
      var envio = respostas[v.id];
      var rasc = P.lerJson('hw-pag:' + SLUG + ':' + v.id);
      var base = (rasc && rasc.payload) || (envio && envio.payload) || {};
      var st = { campos: {}, nota: base.nota || null, comentario: base.comentario || '' };
      v.campos.forEach(function (f) {
        var b = (base.campos && base.campos[f.k]) || {};
        st.campos[f.k] = { v: b.v || null, c: b.c || '' };
      });
      var reg = vendas[v.id] = { venda: v, st: st, enviadoEm: envio ? envio.criado_em : null, sujo: !!rasc };
      var s = secaoVenda(c, v, reg);
      reg.secao = s;
      return s.el;
    });

    c.vendas.forEach(function (v) {
      var reg = vendas[v.id];
      var est = h('span', { class: 'estado-venda' });
      reg.estadoIndice = est;
      indice.appendChild(h('li', null, h('a', { href: '#venda-' + v.id }, h('span', { class: 'nome-venda' }, v.cliente), est)));
      reg.pintarIndice = function () {
        est.textContent = '';
        est.className = 'estado-venda';
        if (reg.enviadoEm && !reg.sujo) { est.className += ' ok'; est.appendChild(P.icone('check')); est.appendChild(document.createTextNode('Enviada ' + P.hora(reg.enviadoEm))); }
        else if (reg.enviadoEm) est.textContent = 'Enviada, com alterações';
        else if (reg.sujo) est.textContent = 'Em andamento';
        else est.textContent = 'Não respondida';
        atualizarContagem();
      };
      reg.pintarIndice();
    });

    raiz.textContent = '';
    raiz.appendChild(h('header', null,
      h('p', { class: 'marca' }, 'Hywork'),
      h('h1', null, c.titulo),
      h('p', { class: 'intro' }, c.intro)));
    raiz.appendChild(h('div', { class: 'quem' }, h('label', { class: 'rotulo', for: 'nome' }, 'Seu nome'), nomeInp));
    raiz.appendChild(h('nav', { class: 'indice-bloco', 'aria-label': 'Vendas' }, h('h2', null, 'Vendas · ', contagem), indice));
    secoes.forEach(function (s) { raiz.appendChild(s); });
    atualizarContagem();

    function secaoVenda(c, v, reg) {
      var st = reg.st;
      var idv = 'venda-' + v.id;
      var estado = h('div', { class: 'estado', role: 'status' });
      var botao = h('button', { class: 'btn', type: 'button' });
      var faltas = {};   // k -> aviso element

      function rotuloBotao() { botao.textContent = reg.enviadoEm ? 'Reenviar avaliação' : 'Enviar avaliação desta venda'; }
      function pintar(tipo, texto, tentar) {
        estado.textContent = '';
        estado.className = 'estado' + (tipo ? ' ' + tipo : '');
        if (!texto) return;
        if (tipo === 'ok') estado.appendChild(P.icone('check'));
        if (tipo === 'erro') estado.appendChild(P.icone('alerta'));
        estado.appendChild(h('span', null, texto));
        if (tentar) estado.appendChild(h('button', { class: 'btn-texto', type: 'button', onclick: tentar }, 'Tentar de novo'));
      }
      function estadoAtual() {
        if (reg.enviadoEm && reg.sujo) pintar('', 'Há alterações ainda não enviadas.');
        else if (reg.enviadoEm) pintar('ok', 'Enviada ' + P.hora(reg.enviadoEm) + '. Dá para alterar e reenviar; vale o último envio.');
        else pintar('', '');
      }
      function alterou() {
        reg.sujo = true;
        P.gravarLocal('hw-pag:' + SLUG + ':' + v.id, JSON.stringify({ payload: payload() }));
        reg.pintarIndice();
        estadoAtual();
      }
      function payload() {
        var campos = {};
        v.campos.forEach(function (f) { campos[f.k] = { v: st.campos[f.k].v, c: st.campos[f.k].c.trim() }; });
        return { cliente: v.cliente, campos: campos, nota: st.nota, comentario: st.comentario.trim() };
      }

      var camposEl = h('div', { class: 'campos' });
      v.campos.forEach(function (f) { camposEl.appendChild(campo(f)); });

      function campo(f) {
        var s = st.campos[f.k];
        var idc = 'c-' + v.id + '-' + f.k;
        var aberto = false;
        var inp = h('input', { class: 'entrada', id: idc + '-com', type: 'text', maxlength: 300, autocomplete: 'off', value: s.c });
        var rot = h('label', { class: 'rotulo', for: idc + '-com' });
        var wrap = h('div', { class: 'comentario' }, rot, inp);
        var btnCom = h('button', { class: 'btn-texto', type: 'button' }, P.icone('mais'), 'Comentar');
        var aviso = h('p', { class: 'aviso-campo', hidden: true }, 'Marque uma opção.');
        faltas[f.k] = aviso;

        function sync() {
          var mostra = s.v === 'E' || s.v === 'I' || aberto || !!inp.value;
          wrap.hidden = !mostra;
          btnCom.hidden = !(s.v && !mostra);
          rot.textContent = s.v === 'E' ? 'O que está errado?' : s.v === 'I' ? 'O que faltou?' : 'Comentário';
          rot.appendChild(h('span', { class: 'opc' }, ' (opcional)'));
        }
        btnCom.addEventListener('click', function () { aberto = true; sync(); inp.focus(); });
        inp.addEventListener('input', function () { s.c = inp.value; alterou(); });

        var grupo = seg('r-' + v.id + '-' + f.k, f.nome + ': avaliação', ESCALA, s.v, function (val) {
          s.v = val; aviso.hidden = true; sync(); alterou();
        });
        sync();

        return h('div', { class: 'campo', id: idc },
          h('div', { class: 'campo-topo' },
            h('h3', null, f.nome),
            f.valor ? h('span', { class: 'fonte' }, 'Fonte: ' + f.fonte) : null),
          f.valor ? h('p', { class: 'valor' }, f.valor) : h('p', { class: 'falta' }, 'Falta'),
          h('div', { class: 'controles' }, grupo, btnCom),
          aviso,
          wrap);
      }

      // nota final
      var avisoNota = h('p', { class: 'aviso-campo', hidden: true }, 'Escolha uma nota de 1 a 5.');
      var notaSeg = seg('n-' + v.id, c.pergunta_nota, NOTAS, st.nota ? String(st.nota) : null, function (val) {
        st.nota = parseInt(val, 10); avisoNota.hidden = true; alterou();
      }, 'larga');
      var geral = h('textarea', { class: 'entrada', id: idv + '-geral', maxlength: 1500, rows: 3 });
      geral.value = st.comentario;
      geral.addEventListener('input', function () { st.comentario = geral.value; alterou(); });

      var secao = h('section', { class: 'venda', id: idv, 'aria-labelledby': idv + '-t' },
        h('div', { class: 'venda-topo' },
          h('div', null,
            h('h2', { id: idv + '-t' }, v.cliente),
            h('p', { class: 'meta' }, v.tipo + ' · ' + (v.hw || 'sem HW') + ' · vendedor ' + v.vendedor)),
          h('a', { class: 'btn-texto', href: v.hubspot, target: '_blank', rel: 'noopener noreferrer' },
            'Abrir no HubSpot', h('span', { class: 'sr-only' }, ' (nova aba)'), P.icone('link'))),
        h('div', { class: 'resumo' }, h('h3', { class: 'rotulo' }, 'Resumo do briefing'), h('p', null, v.resumo)),
        camposEl,
        h('div', { class: 'nota-bloco' },
          h('h3', null, c.pergunta_nota),
          h('div', { class: 'nota-grupo' }, notaSeg, h('div', { class: 'nota-pontas' }, h('span', null, '1 · ' + c.nota_min), h('span', null, '5 · ' + c.nota_max))),
          avisoNota,
          h('div', { class: 'nota-geral' }, h('label', { class: 'rotulo', for: idv + '-geral' }, 'Comentário sobre esta venda ', h('span', { class: 'opc' }, '(opcional)')), geral)),
        h('div', { class: 'rodape' }, botao, estado));

      function enviar() {
        var nome = nomeInp.value.trim();
        var falt = v.campos.filter(function (f) { return !st.campos[f.k].v; });
        Object.keys(faltas).forEach(function (k) { faltas[k].hidden = true; });
        avisoNota.hidden = true;
        if (!nome) { pintar('erro', 'Escreva o seu nome no começo da página.'); nomeInp.focus(); return; }
        if (falt.length || !st.nota) {
          falt.forEach(function (f) { faltas[f.k].hidden = false; });
          if (!st.nota) avisoNota.hidden = false;
          var partes = falt.map(function (f) { return f.nome; });
          if (!st.nota) partes.push('a nota final');
          pintar('erro', 'Falta marcar: ' + partes.join(', ') + '.');
          var alvo = falt.length ? document.getElementById('c-' + v.id + '-' + falt[0].k) : avisoNota;
          alvo.scrollIntoView({ block: 'center' });
          return;
        }
        botao.disabled = true;
        pintar('', 'Enviando…');
        P.enviar(SLUG, chave, v.id, payload(), nome).then(function (r) {
          botao.disabled = false;
          if (r.estado === 'ok') {
            reg.enviadoEm = r.criado_em || new Date().toISOString();
            reg.sujo = false;
            P.apagarLocal('hw-pag:' + SLUG + ':' + v.id);
            rotuloBotao(); reg.pintarIndice(); estadoAtual();
          } else if (r.estado === 'negado') pintar('erro', 'O link não é mais válido. Peça um novo ao Vitor.');
          else if (r.estado === 'recusado') pintar('erro', 'O envio foi recusado' + (r.motivo ? ' (' + r.motivo + ')' : '') + '. Confira os textos.');
          else pintar('erro', 'Não foi possível enviar. Confira a conexão.', enviar);
        });
      }
      botao.addEventListener('click', enviar);
      rotuloBotao();
      estadoAtual();
      return { el: secao };
    }
  }

  iniciar();
})();
