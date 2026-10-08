# Comentários nos decks da Hywork

Formulário estático que o visualizador dos decks abre pelo botão "Comentar este slide". Grava pela função `public.enviar_comentario_deck` do Supabase `hywork-plataforma` (só insere; a tabela `feedback.comentarios_deck` não é exposta). `config.js` traz a URL do projeto e a chave publicável, feita para o navegador.

Fonte e script de publicação: `tools/comentarios-deck/` no repositório `cro-workspace`.

## Páginas com chave

`briefing-handover/` e `ficha-cliente/` são formulários estáticos sem conteúdo: o texto vem da função `public.pagina_obter` só com a chave do link (`?k=`), e a resposta grava por `public.pagina_enviar`, também com a chave. Conteúdo e respostas ficam em `feedback.pagina_conteudo` e `feedback.pagina_respostas`. `comum/` guarda o estilo e o script compartilhados.
