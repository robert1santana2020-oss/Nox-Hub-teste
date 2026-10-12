import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";

const CHAVE_MENSAGENS = "nox_hub_mensagens_v1";
const CHAVE_MEMORIAS = "nox_hub_memoria_pessoal_v1";

function gerarId() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 7);
}

function normalizar(texto = "") {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[?!.,;:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function limparValor(texto = "") {
  return String(texto)
    .replace(/[.!?]+$/g, "")
    .trim();
}

function categorizar(titulo = "") {
  const t = normalizar(titulo);

  if (/nome|me chamo/.test(t)) return "Identidade";
  if (/idade|anos/.test(t)) return "Identidade";
  if (/favorit|prefer|cor|comida|jogo|filme|musica|livro/.test(t)) {
    return "Preferências";
  }
  if (/gosto|amo|adoro|nao gosto|detesto/.test(t)) return "Gostos";
  if (/hobby|passatempo|tempo livre/.test(t)) return "Hobbies";
  if (/objetivo|meta|sonho|plano/.test(t)) return "Objetivos";

  return "Outras";
}

function normalizarMemorias(dados) {
  if (Array.isArray(dados)) {
    return dados.map((item) => ({
      id: String(item.id || gerarId()),
      titulo: String(item.titulo || item.chave || "Informação"),
      valor: String(item.valor ?? item.conteudo ?? ""),
      categoria: item.categoria || categorizar(item.titulo || ""),
      criadoEm: item.criadoEm || new Date().toISOString(),
      atualizadoEm: item.atualizadoEm || item.criadoEm || new Date().toISOString(),
    }));
  }

  // Compatibilidade com a versão antiga, que guardava um objeto.
  if (dados && typeof dados === "object") {
    return Object.entries(dados).map(([titulo, valor]) => ({
      id: gerarId(),
      titulo,
      valor: String(valor ?? ""),
      categoria: categorizar(titulo),
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    }));
  }

  return [];
}

function encontrarMemoria(memorias, consulta) {
  const q = normalizar(consulta);

  if (!q) return null;

  const palavrasIgnoradas = [
    "qual", "quais", "e", "eh", "o", "a", "os", "as",
    "meu", "minha", "meus", "minhas", "sobre", "voce",
    "sabe", "lembra", "lembrar", "disse", "favorita",
    "favorito", "atualmente",
  ];

  const consultaLimpa = q
    .replace(/^(qual e|o que e|quem e|voce sabe|voce lembra|lembra|me diga|diga|qual)\s+/, "")
    .trim();

  // Primeiro, procura o título completo.
  let resultado = memorias.find((m) => {
    const titulo = normalizar(m.titulo);
    return titulo === q || titulo === consultaLimpa;
  });

  if (resultado) return resultado;

  // Depois, procura títulos que aparecem na pergunta.
  resultado = memorias.find((m) => {
    const titulo = normalizar(m.titulo);
    return titulo.length >= 3 &&
      (q.includes(titulo) || consultaLimpa.includes(titulo));
  });

  if (resultado) return resultado;

  // Por último, compara palavras relevantes.
  const palavras = consultaLimpa
    .split(" ")
    .filter((p) => p.length > 2 && !palavrasIgnoradas.includes(p));

  let melhor = null;
  let maiorPontuacao = 0;

  for (const memoria of memorias) {
    const titulo = normalizar(memoria.titulo);
    const palavrasTitulo = titulo.split(" ");
    const pontuacao = palavras.filter((p) =>
      palavrasTitulo.includes(p)
    ).length;

    if (pontuacao > maiorPontuacao) {
      maiorPontuacao = pontuacao;
      melhor = memoria;
    }
  }

  return maiorPontuacao > 0 ? melhor : null;
}

export default function App() {
  const [aba, setAba] = useState("chat");
  const [modo, setModo] = useState("online");
  const [mensagem, setMensagem] = useState("");
  const [mensagens, setMensagens] = useState([
    {
      id: gerarId(),
      tipo: "nox",
      texto: "Sistema iniciado! Sou o Nox Hub. 🧠 Vamos evoluir juntos.",
    },
  ]);

  const [memorias, setMemorias] = useState([]);
  const [tituloNovo, setTituloNovo] = useState("");
  const [valorNovo, setValorNovo] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [tituloEditado, setTituloEditado] = useState("");
  const [valorEditado, setValorEditado] = useState("");

  useEffect(() => {
    if (Platform.OS !== "web") return;

    try {
      const mensagensSalvas = localStorage.getItem(CHAVE_MENSAGENS);
      const memoriasSalvas = localStorage.getItem(CHAVE_MEMORIAS);

      if (mensagensSalvas) {
        const lista = JSON.parse(mensagensSalvas);
        if (Array.isArray(lista) && lista.length) setMensagens(lista);
      }

      if (memoriasSalvas) {
        setMemorias(normalizarMemorias(JSON.parse(memoriasSalvas)));
      }
    } catch (erro) {
      console.log("Não foi possível carregar os dados:", erro);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    try {
      localStorage.setItem(CHAVE_MENSAGENS, JSON.stringify(mensagens));
    } catch (erro) {
      console.log("Não foi possível salvar o histórico:", erro);
    }
  }, [mensagens]);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    try {
      localStorage.setItem(CHAVE_MEMORIAS, JSON.stringify(memorias));
    } catch (erro) {
      console.log("Não foi possível salvar as memórias:", erro);
    }
  }, [memorias]);

  function salvarMemoria(titulo, valor) {
    const t = limparValor(titulo);
    const v = limparValor(valor);

    if (!t || !v) return false;

    const existente = encontrarMemoria(memorias, t);
    const agora = new Date().toISOString();

    if (existente && normalizar(existente.titulo) === normalizar(t)) {
      setMemorias((anteriores) =>
        anteriores.map((m) =>
          m.id === existente.id
            ? {
                ...m,
                titulo: t,
                valor: v,
                categoria: categorizar(t),
                atualizadoEm: agora,
              }
            : m
        )
      );
    } else {
      setMemorias((anteriores) => [
        {
          id: gerarId(),
          titulo: t,
          valor: v,
          categoria: categorizar(t),
          criadoEm: agora,
          atualizadoEm: agora,
        },
        ...anteriores,
      ]);
    }

    return true;
  }

  function adicionarMemoriaManual() {
    if (!tituloNovo.trim() || !valorNovo.trim()) {
      Alert.alert("Faltou informação", "Preencha o título e o conteúdo.");
      return;
    }

    salvarMemoria(tituloNovo, valorNovo);
    setTituloNovo("");
    setValorNovo("");
    Alert.alert("Memória salva", "Informação adicionada ao Nox! 🧠");
  }

  function iniciarEdicao(memoria) {
    setEditandoId(memoria.id);
    setTituloEditado(memoria.titulo);
    setValorEditado(memoria.valor);
  }

  function confirmarEdicao() {
    if (!tituloEditado.trim() || !valorEditado.trim()) {
      Alert.alert("Faltou informação", "Preencha o título e o conteúdo.");
      return;
    }

    const agora = new Date().toISOString();

    setMemorias((anteriores) =>
      anteriores.map((m) =>
        m.id === editandoId
          ? {
              ...m,
              titulo: limparValor(tituloEditado),
              valor: limparValor(valorEditado),
              categoria: categorizar(tituloEditado),
              atualizadoEm: agora,
            }
          : m
      )
    );

    setEditandoId(null);
    setTituloEditado("");
    setValorEditado("");
  }

  function excluirMemoria(id) {
    Alert.alert("Excluir memória", "Quer apagar esta informação?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => {
          setMemorias((anteriores) =>
            anteriores.filter((m) => m.id !== id)
          );
        },
      },
    ]);
  }

  function responder(pergunta) {
    const original = pergunta.trim();
    const p = normalizar(original);

    if (!p) return "Pode mandar sua pergunta!";

    // Comandos para apagar memórias.
    if (
      /^(esqueca|esquece|apague|apagar|delete|exclua|remova)\s+(todas as minhas memorias|todas as memorias)$/.test(p)
    ) {
      setMemorias([]);
      return "Pronto! Apaguei todas as memórias guardadas. 🧹";
    }

    if (
      /^(quais|liste|listar|mostre|mostrar|ver)\s+(sao\s+)?(as\s+)?(minhas\s+)?memorias$/.test(p) ||
      p.includes("o que voce lembra de mim") ||
      p.includes("o que voce sabe sobre mim")
    ) {
      if (!memorias.length) return "Ainda não tenho memórias salvas.";

      return "Aqui está o que lembro:\n" +
        memorias.map((m) => `• ${m.titulo}: ${m.valor}`).join("\n");
    }

    const apagarUma = p.match(
      /^(?:esqueca|esquece|apague|apagar|exclua|remova)\s+(?:que\s+)?(.+)$/
    );

    if (apagarUma) {
      const alvo = encontrarMemoria(memorias, apagarUma[1]);

      if (!alvo) return "Não encontrei uma memória correspondente para apagar.";

      setMemorias((anteriores) =>
        anteriores.filter((m) => m.id !== alvo.id)
      );

      return `Pronto! Esqueci "${alvo.titulo}". 🧹`;
    }

    // Exemplo: "Salve meu nome Moisés".
    const comandoNome = original.match(
      /^(?:nox[, ]*)?(?:salve|salvar|guarde|guarda|anote|lembre-se de)\s+meu nome\s+(?:(?:é|e|eh)\s+)?(.+)$/i
    );

    // Exemplo: "Meu nome é Moisés" ou "Me chamo Moisés".
    const declaracaoNome = original.match(
      /^(?:meu nome\s+(?:é|e|eh)|me chamo|eu me chamo)\s+(.+)$/i
    );

    if (comandoNome || declaracaoNome) {
      const nome = limparValor((comandoNome || declaracaoNome)[1]);

      if (salvarMemoria("meu nome", nome)) {
        return `Fechado! Vou lembrar que seu nome é ${nome}. 🧠`;
      }
    }

    // Exemplo: "Salve minha comida favorita como pizza".
    const comandoGenerico = original.match(
      /^(?:nox[, ]*)?(?:salve|salvar|guarde|guarda|anote|registre|lembre-se de)\s+(?:que\s+)?(.+?)\s+(?:como|é|e|eh|=)\s+(.+)$/i
    );

    if (comandoGenerico) {
      const titulo = limparValor(comandoGenerico[1]);
      const valor = limparValor(comandoGenerico[2]);

      if (salvarMemoria(titulo, valor)) {
        return `Pronto! Vou lembrar que ${titulo.replace(/^(meu|minha)\s+/i, "seu ")} é ${valor}. 🧠`;
      }
    }

    // Exemplo: "Minha cor favorita é vermelho".
    const declaracao = original.match(
      /^(meu|minha)\s+(.+?)\s+(?:é|e|eh|=)\s+(.+)$/i
    );

    if (declaracao) {
      const titulo = `${declaracao[1]} ${declaracao[2]}`;
      const valor = limparValor(declaracao[3]);

      if (salvarMemoria(titulo, valor)) {
        return `Anotado! Vou lembrar: ${titulo}: ${valor}. 🧠`;
      }
    }

    // Exemplo: "Gosto de jogos de RPG".
    const gosto = original.match(
      /^(?:eu\s+)?(gosto de|adoro|amo|nao gosto de|detesto)\s+(.+)$/i
    );

    if (gosto) {
      const titulo = `${gosto[1]} coisas`;
      const valor = limparValor(gosto[2]);

      if (salvarMemoria(titulo, valor)) {
        return `Entendido! Vou guardar que você ${gosto[1]} ${valor}. 🧠`;
      }
    }

    // Consultas específicas, como nome e preferências.
    const consultaNome =
      p.includes("meu nome") ||
      p.includes("como eu me chamo") ||
      p.includes("quem sou eu");

    if (consultaNome) {
      const m = encontrarMemoria(memorias, "meu nome");
      if (m) return `Seu nome é ${m.valor}! 😎`;
    }

    const consultaCor =
      p.includes("minha cor favorita") ||
      p.includes("minha cor preferida");

    if (consultaCor) {
      const m = encontrarMemoria(memorias, "minha cor favorita") ||
        encontrarMemoria(memorias, "minha cor preferida");

      if (m) return `Sua cor favorita é ${m.valor}! 🎨`;
    }

    const consultaComida =
      p.includes("minha comida favorita") ||
      p.includes("minha comida preferida");

    if (consultaComida) {
      const m = encontrarMemoria(memorias, "minha comida favorita") ||
        encontrarMemoria(memorias, "minha comida preferida");

      if (m) return `Sua comida favorita é ${m.valor}! 🍕`;
    }

    // Procura uma memória relacionada à pergunta.
    const consultaGenerica = encontrarMemoria(memorias, original);

    if (
      consultaGenerica &&
      /qual|quem|quando|onde|como|me diga|voce lembra|voce sabe|o que/.test(p)
    ) {
      return `Lembro disso: ${consultaGenerica.titulo}: ${consultaGenerica.valor}. 🧠`;
    }

    if (
      p.includes("obrigado") ||
      p.includes("obrigada") ||
      p.includes("valeu")
    ) {
      return "Tamo junto! 😎 Cada dia vamos deixar o Nox mais capaz.";
    }

    if (p.includes("oi") || p.includes("ola") || p.startsWith("eai")) {
      return "E aí! 😎 Sou o Nox Hub. O que vamos fazer hoje?";
    }

    return "Ainda estou aprendendo a responder isso. Posso guardar informações, recuperar memórias e conversar com base nas regras programadas. Uma IA real será uma próxima etapa! 🤖";
  }

  function enviarMensagem() {
    const texto = mensagem.trim();
    if (!texto) return;

    const doUsuario = {
      id: gerarId(),
      tipo: "usuario",
      texto,
    };

    setMensagens((anteriores) => [...anteriores, doUsuario]);
    setMensagem("");

    const resposta = responder(texto);

    setMensagens((anteriores) => [
      ...anteriores,
      { id: gerarId(), tipo: "nox", texto: resposta },
    ]);
  }

  function limparHistorico() {
    Alert.alert("Limpar conversa", "Deseja apagar o histórico do chat?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: () => setMensagens([]),
      },
    ]);
  }
  return (
    <SafeAreaView style={estilos.container}>
      <KeyboardAvoidingView
        style={estilos.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={estilos.topo}>
          <View style={estilos.logoLinha}>
            <View style={estilos.logo}>
              <Text style={estilos.logoTexto}>N</Text>
            </View>

            <View style={estilos.tituloArea}>
              <Text style={estilos.titulo}>NOX HUB</Text>
              <Text style={estilos.subtitulo}>
                Assistente em evolução
              </Text>
            </View>

            <View style={estilos.status}>
              <View style={estilos.pontoOnline} />
              <Text style={estilos.statusTexto}>Ativo</Text>
            </View>
          </View>

          <View style={estilos.seletorModo}>
            <TouchableOpacity
              style={[
                estilos.modoBotao,
                modo === "online" && estilos.modoSelecionado,
              ]}
              onPress={() => setModo("online")}
            >
              <Text
                style={[
                  estilos.modoTexto,
                  modo === "online" && estilos.textoSelecionado,
                ]}
              >
                ☁️ Online
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                estilos.modoBotao,
                modo === "local" && estilos.modoSelecionado,
              ]}
              onPress={() => setModo("local")}
            >
              <Text
                style={[
                  estilos.modoTexto,
                  modo === "local" && estilos.textoSelecionado,
                ]}
              >
                📱 Local
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={estilos.avisoModo}>
            {modo === "online"
              ? "Modo Online demonstrativo"
              : "Modo Local demonstrativo"}
          </Text>
        </View>

        <View style={estilos.abas}>
          <TouchableOpacity
            style={[estilos.aba, aba === "chat" && estilos.abaAtiva]}
            onPress={() => setAba("chat")}
          >
            <Text
              style={[
                estilos.abaTexto,
                aba === "chat" && estilos.abaTextoAtiva,
              ]}
            >
              💬 Chat
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[estilos.aba, aba === "memorias" && estilos.abaAtiva]}
            onPress={() => setAba("memorias")}
          >
            <Text
              style={[
                estilos.abaTexto,
                aba === "memorias" && estilos.abaTextoAtiva,
              ]}
            >
              🧠 Memórias ({memorias.length})
            </Text>
          </TouchableOpacity>
        </View>

        {aba === "chat" ? (
          <View style={estilos.areaChat}>
            <ScrollView
              style={estilos.listaMensagens}
              contentContainerStyle={estilos.conteudoChat}
              keyboardShouldPersistTaps="handled"
            >
              {mensagens.map((item) => (
                <View
                  key={item.id}
                  style={[
                    estilos.linhaMensagem,
                    item.tipo === "usuario"
                      ? estilos.linhaUsuario
                      : estilos.linhaNox,
                  ]}
                >
                  <View
                    style={[
                      estilos.bolha,
                      item.tipo === "usuario"
                        ? estilos.bolhaUsuario
                        : estilos.bolhaNox,
                    ]}
                  >
                    <Text style={estilos.autor}>
                      {item.tipo === "usuario" ? "Você" : "Nox"}
                    </Text>
                    <Text style={estilos.textoMensagem}>
                      {item.texto}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={estilos.atalhos}>
              <TouchableOpacity
                style={estilos.atalho}
                onPress={() => setMensagem("Quais são minhas memórias?")}
              >
                <Text style={estilos.atalhoTexto}>Ver memórias</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={estilos.atalho}
                onPress={() => setMensagem("Qual é minha comida favorita?")}
              >
                <Text style={estilos.atalhoTexto}>🍕 Testar memória</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={estilos.atalho}
                onPress={limparHistorico}
              >
                <Text style={estilos.atalhoTexto}>Limpar chat</Text>
              </TouchableOpacity>
            </View>

            <View style={estilos.compositor}>
              <TextInput
                style={estilos.campoMensagem}
                value={mensagem}
                onChangeText={setMensagem}
                placeholder="Converse com o Nox..."
                placeholderTextColor="#8494A7"
                multiline
                onSubmitEditing={() => {
                  if (Platform.OS === "web") enviarMensagem();
                }}
              />

              <TouchableOpacity
                style={estilos.botaoEnviar}
                onPress={enviarMensagem}
              >
                <Text style={estilos.enviarTexto}>➤</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <ScrollView
            style={estilos.areaMemorias}
            contentContainerStyle={estilos.conteudoMemorias}
            keyboardShouldPersistTaps="handled"
          >
            <View style={estilos.cartaoResumo}>
              <Text style={estilos.resumoTitulo}>
                🧠 Centro de Memória
              </Text>
              <Text style={estilos.resumoTexto}>
                O Nox tem {memorias.length}{" "}
                {memorias.length === 1 ? "informação salva" : "informações salvas"}.
              </Text>
              <Text style={estilos.resumoAjuda}>
                Adicione, edite ou exclua o que ele deve lembrar.
              </Text>
            </View>

            <View style={estilos.cartaoFormulario}>
              <Text style={estilos.tituloSecao}>Nova memória</Text>

              <TextInput
                style={estilos.campoFormulario}
                value={tituloNovo}
                onChangeText={setTituloNovo}
                placeholder="Título, ex.: jogo favorito"
                placeholderTextColor="#8494A7"
              />

              <TextInput
                style={[estilos.campoFormulario, estilos.campoValor]}
                value={valorNovo}
                onChangeText={setValorNovo}
                placeholder="Informação, ex.: Skyrim"
                placeholderTextColor="#8494A7"
                multiline
              />

              <TouchableOpacity
                style={estilos.botaoPrimario}
                onPress={adicionarMemoriaManual}
              >
                <Text style={estilos.botaoPrimarioTexto}>
                  + Salvar memória
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={estilos.tituloSecao}>
              Informações guardadas
            </Text>

            {memorias.length === 0 ? (
              <View style={estilos.vazio}>
                <Text style={estilos.vazioEmoji}>🌌</Text>
                <Text style={estilos.vazioTitulo}>
                  Ainda não há memórias
                </Text>
                <Text style={estilos.vazioTexto}>
                  Converse com o Nox ou adicione uma informação acima.
                </Text>
              </View>
            ) : (
              memorias.map((item) => (
                <View key={item.id} style={estilos.cartaoMemoria}>
                  {editandoId === item.id ? (
                    <View style={estilos.edicaoArea}>
                      <TextInput
                        style={estilos.campoFormulario}
                        value={tituloEditado}
                        onChangeText={setTituloEditado}
                        placeholder="Título"
                        placeholderTextColor="#8494A7"
                      />

                      <TextInput
                        style={[estilos.campoFormulario, estilos.campoValor]}
                        value={valorEditado}
                        onChangeText={setValorEditado}
                        placeholder="Conteúdo"
                        placeholderTextColor="#8494A7"
                        multiline
                      />

                      <View style={estilos.acoesLinha}>
                        <TouchableOpacity
                          style={estilos.botaoPrimario}
                          onPress={confirmarEdicao}
                        >
                          <Text style={estilos.botaoPrimarioTexto}>
                            Salvar edição
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={estilos.botaoSecundario}
                          onPress={() => setEditandoId(null)}
                        >
                          <Text style={estilos.botaoSecundarioTexto}>
                            Cancelar
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={estilos.memoriaCabecalho}>
                        <Text style={estilos.memoriaCategoria}>
                          {item.categoria || categorizar(item.titulo)}
                        </Text>

                        <Text style={estilos.memoriaData}>
                          {item.atualizadoEm
                            ? "Salva"
                            : "Memória"}
                        </Text>
                      </View>

                      <Text style={estilos.memoriaTitulo}>
                        {item.titulo}
                      </Text>

                      <Text style={estilos.memoriaValor}>
                        {item.valor}
                      </Text>

                      <View style={estilos.acoesLinha}>
                        <TouchableOpacity
                          style={estilos.botaoSecundario}
                          onPress={() => iniciarEdicao(item)}
                        >
                          <Text style={estilos.botaoSecundarioTexto}>
                            ✏️ Editar
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={estilos.botaoExcluir}
                          onPress={() => excluirMemoria(item.id)}
                        >
                          <Text style={estilos.botaoExcluirTexto}>
                            🗑️ Excluir
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const estilos = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#07111F",
  },
  topo: {
    backgroundColor: "#0B1728",
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "android" ? 18 : 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1A3048",
  },
  logoLinha: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#073B50",
    borderWidth: 1,
    borderColor: "#00D4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  logoTexto: {
    color: "#00D4FF",
    fontSize: 27,
    fontWeight: "900",
  },
  tituloArea: {
    flex: 1,
    marginLeft: 12,
  },
  titulo: {
    color: "#F0F7FF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 2,
  },
  subtitulo: {
    color: "#8DA6BE",
    fontSize: 12,
    marginTop: 3,
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#102C2B",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },
  pontoOnline: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#35E6A1",
    marginRight: 6,
  },
  statusTexto: {
    color: "#79F0C1",
    fontSize: 11,
    fontWeight: "700",
  },
  seletorModo: {
    flexDirection: "row",
    backgroundColor: "#07111F",
    borderRadius: 12,
    padding: 4,
    marginTop: 17,
  },
  modoBotao: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  modoSelecionado: {
    backgroundColor: "#123B52",
    borderWidth: 1,
    borderColor: "#00BFEA",
  },
  modoTexto: {
    color: "#8FA4BA",
    fontSize: 13,
    fontWeight: "600",
  },
  textoSelecionado: {
    color: "#66E4FF",
  },
  avisoModo: {
    color: "#70869D",
    fontSize: 10,
    textAlign: "center",
    marginTop: 7,
  },
  abas: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: "#0B1728",
  },
  aba: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  abaAtiva: {
    borderBottomColor: "#00D4FF",
  },
  abaTexto: {
    color: "#8196AD",
    fontSize: 13,
    fontWeight: "600",
  },
  abaTextoAtiva: {
    color: "#5FE4FF",
  },
  areaChat: {
    flex: 1,
  },
  listaMensagens: {
    flex: 1,
  },
  conteudoChat: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 20,
  },
  linhaMensagem: {
    width: "100%",
    marginBottom: 14,
    flexDirection: "row",
  },
  linhaUsuario: {
    justifyContent: "flex-end",
  },
  linhaNox: {
    justifyContent: "flex-start",
  },
  bolha: {
    maxWidth: "88%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  bolhaUsuario: {
    backgroundColor: "#124A65",
    borderBottomRightRadius: 4,
  },
  bolhaNox: {
    backgroundColor: "#132236",
    borderWidth: 1,
    borderColor: "#21364E",
    borderBottomLeftRadius: 4,
  },
  autor: {
    color: "#61DFFF",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 5,
  },
  textoMensagem: {
    color: "#E6EFF8",
    fontSize: 14,
    lineHeight: 21,
  },
  atalhos: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 10,
    paddingBottom: 8,
    gap: 7,
  },
  atalho: {
    backgroundColor: "#102338",
    borderWidth: 1,
    borderColor: "#24425A",
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  atalhoTexto: {
    color: "#A9DDF0",
    fontSize: 11,
  },
  compositor: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 20 : 12,
    borderTopWidth: 1,
    borderTopColor: "#1A3048",
    backgroundColor: "#0B1728",
  },
  campoMensagem: {
    flex: 1,
    maxHeight: 110,
    minHeight: 46,
    color: "#F0F7FF",
    backgroundColor: "#132236",
    borderWidth: 1,
    borderColor: "#29425A",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  botaoEnviar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#00BFEA",
    marginLeft: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  enviarTexto: {
    color: "#04121D",
    fontSize: 22,
    fontWeight: "900",
  },
  areaMemorias: {
    flex: 1,
  },
  conteudoMemorias: {
    padding: 15,
    paddingBottom: 35,
  },
  cartaoResumo: {
    backgroundColor: "#102A3D",
    borderWidth: 1,
    borderColor: "#17617A",
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  resumoTitulo: {
    color: "#64E3FF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 7,
  },
  resumoTexto: {
    color: "#EDF7FF",
    fontSize: 14,
    fontWeight: "600",
  },
  resumoAjuda: {
    color: "#9BB6CA",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },
  cartaoFormulario: {
    backgroundColor: "#101E30",
    borderWidth: 1,
    borderColor: "#223A52",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  tituloSecao: {
    color: "#EAF4FF",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  campoFormulario: {
    backgroundColor: "#091625",
    borderWidth: 1,
    borderColor: "#29445E",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: "#F1F7FF",
    fontSize: 14,
    marginBottom: 10,
  },
  campoValor: {
    minHeight: 48,
    textAlignVertical: "top",
  },
  botaoPrimario: {
    backgroundColor: "#00BFEA",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoPrimarioTexto: {
    color: "#04121D",
    fontWeight: "800",
    fontSize: 13,
  },
  botaoSecundario: {
    backgroundColor: "#172B40",
    borderWidth: 1,
    borderColor: "#31516B",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoSecundarioTexto: {
    color: "#BBD7EA",
    fontWeight: "700",
    fontSize: 12,
  },
  botaoExcluir: {
    backgroundColor: "#351B29",
    borderWidth: 1,
    borderColor: "#743449",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoExcluirTexto: {
    color: "#FF9CAD",
    fontWeight: "700",
    fontSize: 12,
  },
  cartaoMemoria: {
    backgroundColor: "#101E30",
    borderWidth: 1,
    borderColor: "#223A52",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  memoriaCabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  memoriaCategoria: {
    color: "#60DFFF",
    backgroundColor: "#103347",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: "hidden",
    fontSize: 10,
    fontWeight: "800",
  },
  memoriaData: {
    color: "#7189A1",
    fontSize: 10,
  },
  memoriaTitulo: {
    color: "#EDF5FF",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 5,
  },
  memoriaValor: {
    color: "#A9C0D4",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 13,
  },
  acoesLinha: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 4,
  },
  edicaoArea: {
    gap: 4,
  },
  vazio: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#101E30",
    borderWidth: 1,
    borderColor: "#223A52",
    borderRadius: 16,
    padding: 24,
    marginTop: 4,
  },
  vazioEmoji: {
    fontSize: 35,
    marginBottom: 12,
  },
  vazioTitulo: {
    color: "#EAF4FF",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 7,
  },
  vazioTexto: {
    color: "#92A9BF",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});