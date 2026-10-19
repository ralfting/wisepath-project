import type { Shape } from '@/i18n/format';
import type { auth as en } from '@/i18n/messages/en/auth';

/** Mensagens da área auth, em português do Brasil */
export const auth = {
  landing: {
    explore: 'Explorar trilhas',
    tagline: 'Mapeie o que você está aprendendo, página por página, até o “Agora eu sei”.',
    what: 'Uma página de anotações para cada coisa que você aprende.',
    links: 'Ligadas com [[ ]], para o assunto ganhar forma de mapa.',
    study: 'Seguidas página por página, marcando o que você estudou.',
    logIn: 'Entrar',
    signUp: 'Criar conta',
  },
  fields: {
    email: 'E-mail',
    emailPlaceholder: 'voce@exemplo.com',
    password: 'Senha',
    name: 'Nome',
    namePlaceholder: 'Como devemos chamar você?',
  },
  login: {
    title: 'Entrar',
    intro: 'Informe seu e-mail e sua senha para continuar nas suas trilhas.',
    passwordPlaceholder: 'Sua senha',
    submit: 'Entrar',
    noAccount: 'Não tem uma conta?',
    signUp: 'Criar conta',
  },
  signup: {
    title: 'Criar uma conta',
    intro: 'Suas trilhas e notas ficam guardadas nesta conta.',
    passwordHint: 'Pelo menos 8 caracteres',
    passwordPlaceholder: 'Escolha uma senha',
    submit: 'Criar conta',
    haveAccount: 'Já tem uma conta?',
    logIn: 'Entrar',
  },
  deleteAccount: {
    title: 'Excluir sua conta?',
    body: 'Todas as trilhas que você criou são excluídas, com as páginas, junto com seus projetos, sua Caixa de entrada e seu progresso nas trilhas de outras pessoas. Quem estuda as suas trilhas deixa de ter acesso. Não dá para desfazer.',
    downloadFirst: 'Baixar minhas trilhas antes',
    confirmHint: 'Digite sua senha para confirmar.',
    keep: 'Manter minha conta',
    confirm: 'Excluir conta',
    wrongPassword: 'Essa senha não está certa.',
  },
  errors: {
    invalidCredentials: 'E-mail ou senha incorretos.',
    emailTaken: 'Já existe uma conta com este e-mail. Entre com ela.',
  },
  /** As mensagens de validação do domínio (veja useCases/validation.ts) */
  validation: {
    email: 'Informe um e-mail válido',
    password: 'Informe sua senha',
    name: 'Informe seu nome',
    passwordLength: 'Use pelo menos 8 caracteres',
  },
} as const satisfies Shape<typeof en>;
