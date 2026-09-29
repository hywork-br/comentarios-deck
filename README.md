# Comentários nos decks da Hywork

Formulário estático que o visualizador dos decks abre pelo botão "Comentar este slide". Grava pela função `public.enviar_comentario_deck` do Supabase `hywork-plataforma` (só insere; a tabela `feedback.comentarios_deck` não é exposta). `config.js` traz a URL do projeto e a chave publicável, feita para o navegador.

Fonte e script de publicação: `tools/comentarios-deck/` no repositório `cro-workspace`.
