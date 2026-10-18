# Política de privacidade do WisePath (rascunho)

> Rascunho de 2026-10-18 para revisão do responsável pelo WisePath, escrito a partir do que o código faz hoje.
> Não é orientação jurídica. Os trechos entre colchetes precisam ser preenchidos ou confirmados. Só entra no app
> depois de aprovado, em português e em inglês.

Última atualização: [DATA]

## 1. Quem cuida dos seus dados

O controlador é [NOME DO RESPONSÁVEL], contato [E-MAIL DE CONTATO], que também atende pedidos sobre a Lei Geral de
Proteção de Dados (LGPD).

## 2. O que guardamos

| Dado | Para quê |
|---|---|
| Nome, e-mail e senha (guardada só como hash bcrypt, nunca em texto) | Criar a conta e entrar |
| Idioma escolhido | Mostrar o app no seu idioma |
| Trilhas, páginas, projetos e itens da Caixa de entrada | O caderno em si |
| Páginas marcadas como estudadas, com a data | Seu progresso; ninguém mais vê |
| E-mails que você digita para compartilhar uma trilha | Dar acesso a essas pessoas; um e-mail sem conta fica como convite até alguém se cadastrar com ele |
| Avisos de trilhas que você perdeu | Mostrar uma vez que uma trilha deixou de estar disponível |
| Pedidos de publicação | Revisar o que vai para o catálogo |

Não usamos ferramentas de análise, publicidade nem rastreamento de terceiros, e não vendemos dados.

## 3. Cookies e armazenamento no navegador

- `access_token`: mantém você conectado por até 30 dias, renovado enquanto você usa o app. É `httpOnly`; o código
  da página não o lê.
- `wp-locale`: o idioma escolhido, para a página já abrir nele.
- Armazenamento local do navegador: preferências de tela e as páginas abertas recentemente, separadas por conta.

## 4. Quem vê o quê

- Uma trilha privada: só você e as pessoas que você convidou.
- Uma trilha com link: qualquer pessoa com o endereço, sem conta.
- Uma trilha publicada: qualquer pessoa, e os buscadores.
- O seu progresso nunca aparece para ninguém, nem para o dono da trilha.
- Quem criou uma trilha vê o nome e o e-mail das pessoas que convidou, nunca quem pegou a trilha pública para
  estudar. Quem estuda uma trilha de outra pessoa vê o nome de quem a criou.

## 5. Serviços que usamos para funcionar

- [Vercel](https://vercel.com), que hospeda o site e a API, nos Estados Unidos.
- [Neon](https://neon.com), que hospeda o banco de dados, na região [REGIÃO DO BANCO].
- Quando uma página tem um endereço da web, nosso servidor busca o título e o ícone do site; o site vê o nosso
  servidor, não você.
- Vídeos do YouTube são incorporados pelo domínio `youtube-nocookie.com`; ao tocar um vídeo, o YouTube recebe dados
  conforme a política dele.

Esses serviços ficam fora do Brasil; a transferência segue o art. 33 da LGPD.

## 6. Por quanto tempo

Guardamos seus dados enquanto a conta existir. Ao excluir a conta, apagamos na hora a conta, as trilhas que você
criou, seus projetos, sua Caixa de entrada e seu progresso. Cópias de segurança do provedor do banco podem manter
esses dados por até [N] dias antes de sumirem.

## 7. Seus direitos (LGPD, art. 18)

Você pode, a qualquer momento:

- ver e corrigir seus dados no app;
- levar seus dados: baixe suas trilhas em Markdown no menu da conta;
- apagar tudo: exclua a conta no menu da conta;
- pedir informações sobre o uso dos seus dados ou qualquer outro direito pelo e-mail [E-MAIL DE CONTATO].

## 8. Segurança

Senhas são guardadas com bcrypt, a sessão fica num cookie `httpOnly`, e toda conexão usa HTTPS.

## 9. Idade

O WisePath é para pessoas a partir de [13] anos. [CONFIRMAR: regra para menores, LGPD art. 14.]

## 10. Mudanças

Quando esta política mudar de forma relevante, avisaremos no app antes de a mudança valer.
