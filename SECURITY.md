# Segurança

O Encore não tem servidor: todos os dados ficam no IndexedDB do aparelho, e o app não envia nada pela rede.
Mesmo assim, se você achar uma vulnerabilidade (por exemplo, no import de backup ou no service worker),
**não abra uma issue pública**: use "Report a vulnerability" na aba _Security_ do repositório no GitHub.

## Privacidade dos dados

- O backup (`encore-backup-*.json`) é texto puro, sem criptografia. Guarde-o como guardaria qualquer dado pessoal.
- Importar um backup só **adiciona/atualiza** dados e valida cada registro; arquivos malformados são recusados.
