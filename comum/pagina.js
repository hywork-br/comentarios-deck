/* Base das páginas públicas com chave: chave do link, chamada às funções public.pagina_*, helpers de DOM.
   Nada de conteúdo de cliente aqui: o conteúdo vem do Supabase só com a chave certa. */
(function () {
  'use strict';
  var cfg = window.COMENTARIOS || {};

  var ICONES = {
    check: '<path d="M20 6 9 17l-5-5"/>',
    link: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    alerta: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    mais: '<path d="M5 12h14"/><path d="M12 5v14"/>'
  };

  function icone(nome) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'icone');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = ICONES[nome];
    return svg;
  }

  // h('div', {class: 'x', onclick: fn}, filho, 'texto'...)
  function h(tag, props) {
    var el = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    });
    for (var i = 2; i < arguments.length; i++) anexar(el, arguments[i]);
    return el;
  }
  function anexar(el, f) {
    if (f === null || f === undefined || f === false) return;
    if (Array.isArray(f)) f.forEach(function (x) { anexar(el, x); });
    else el.appendChild(typeof f === 'string' || typeof f === 'number' ? document.createTextNode(String(f)) : f);
  }

  function chaveDoLink() {
    var k = new URLSearchParams(location.search).get('k');
    if (!k && location.hash) {
      var m = /[#&]k=([^&]+)/.exec(location.hash);
      if (m) { try { k = decodeURIComponent(m[1]); } catch (e) { k = m[1]; } }
    }
    return (k || '').trim();
  }

  function rpc(fn, corpo) {
    return fetch(cfg.url + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: cfg.chave },
      body: JSON.stringify(corpo)
    }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (j) { return { ok: r.ok, status: r.status, data: j }; });
    });
  }

  // -> {estado: 'ok'|'sem-chave'|'negado'|'rede', conteudo, respostas}
  function carregar(slug, chave) {
    if (!chave) return Promise.resolve({ estado: 'sem-chave' });
    return rpc('pagina_obter', { p_slug: slug, p_chave: chave }).then(function (r) {
      if (r.ok && r.data && r.data.conteudo) return { estado: 'ok', conteudo: r.data.conteudo, respostas: r.data.respostas || {} };
      if (r.status === 403) return { estado: 'negado' };
      return { estado: 'rede' };
    }, function () { return { estado: 'rede' }; });
  }

  // -> {estado: 'ok', criado_em} | {estado: 'negado'} | {estado: 'recusado', motivo} | {estado: 'rede'}
  function enviar(slug, chave, item, payload, nome) {
    return rpc('pagina_enviar', { p_slug: slug, p_chave: chave, p_item: item, p_payload: payload, p_nome: nome || null }).then(function (r) {
      if (r.ok && r.data && r.data.id) return { estado: 'ok', criado_em: r.data.criado_em };
      if (r.status === 403) return { estado: 'negado' };
      if (r.status >= 400 && r.status < 500) return { estado: 'recusado', motivo: (r.data && r.data.message) || '' };
      return { estado: 'rede' };
    }, function () { return { estado: 'rede' }; });
  }

  function hora(iso) {
    var d = iso ? new Date(iso) : new Date();
    var hoje = new Date();
    var hm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === hoje.toDateString()) return hm;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + hm;
  }

  // Armazenamento do navegador é só conveniência (rascunho, nome): pode falhar, a página funciona sem ele.
  function lerLocal(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function gravarLocal(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } }
  function apagarLocal(k) { try { localStorage.removeItem(k); } catch (e) { /* sem armazenamento */ } }
  function lerJson(k) { var s = lerLocal(k); if (!s) return null; try { return JSON.parse(s); } catch (e) { return null; } }

  // Mensagem de página inteira (sem chave, chave errada, rede).
  function aviso(raiz, titulo, texto, tentarDeNovo) {
    raiz.textContent = '';
    raiz.appendChild(h('div', { class: 'aviso-pagina' },
      h('p', { class: 'marca' }, 'Hywork'),
      h('h1', null, titulo),
      h('p', null, texto),
      tentarDeNovo ? h('p', null, h('button', { class: 'btn', type: 'button', onclick: tentarDeNovo }, 'Tentar de novo')) : null));
  }

  function falhaDeCarga(raiz, r, tentar) {
    if (r.estado === 'sem-chave') aviso(raiz, 'Este link está incompleto', 'Abra o link exatamente como foi enviado pelo Vitor, com a chave no final.');
    else if (r.estado === 'negado') aviso(raiz, 'Este link não abre', 'A chave não confere. Peça um link novo ao Vitor.');
    else aviso(raiz, 'Não consegui carregar a página', 'Confira a conexão e tente de novo.', tentar);
  }

  window.Pagina = {
    h: h, icone: icone, chaveDoLink: chaveDoLink, carregar: carregar, enviar: enviar, hora: hora,
    lerLocal: lerLocal, gravarLocal: gravarLocal, apagarLocal: apagarLocal, lerJson: lerJson,
    aviso: aviso, falhaDeCarga: falhaDeCarga
  };
})();
