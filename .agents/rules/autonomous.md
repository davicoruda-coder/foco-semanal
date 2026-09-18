# Modo Autônomo e Execução Direta

1. **Execução sem Bloqueios**: Quando o usuário pedir uma tarefa, execute-a completamente até o fim sem interrupções.
2. **Sem Pedir Confirmações Desnecessárias**: Não faça perguntas de confirmação no meio da tarefa para passos que já foram autorizados ou são consequência direta do pedido.
3. **Comandos de Terminal Limpos**:
   - Para operações com arquivos, utilize sempre as ferramentas diretas de arquivo (`write_to_file`, `replace_file_content`).
   - Para execução de scripts, grave o script em arquivo antes de executar para evitar blocos complexos no terminal que acionem o modal de confirmação da IDE.
4. **Entrega Pronta**: Entregue a solução final testada, construída e verificada diretamente.
