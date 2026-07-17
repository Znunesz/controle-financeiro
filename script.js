const categorias = [
    "Salário", "Alimentação", "Transporte", "Moradia",
    "Lazer", "Saúde", "Educação", "Outros"
];

let transacoes = JSON.parse(localStorage.getItem("transacoes")) || [];
let editandoId = null;

const historico = document.getElementById("historico");
const listaVazia = document.getElementById("listaVazia");

const inputDescricao = document.getElementById("descricao");
const inputValor = document.getElementById("valor");
const selectTipo = document.getElementById("tipo");
const selectCategoria = document.getElementById("categoria");
const inputData = document.getElementById("data");

const btnAdicionar = document.getElementById("btnAdicionar");
const btnCancelar = document.getElementById("btnCancelar");

const filtroTipo = document.getElementById("filtroTipo");
const filtroCategoria = document.getElementById("filtroCategoria");
const filtroMes = document.getElementById("filtroMes");
const btnLimparFiltros = document.getElementById("btnLimparFiltros");
const btnExportar = document.getElementById("btnExportar");

let grafico = null;

function formatarMoeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(valor);
}

function formatarDataExibicao(dataISO) {
    if (!dataISO) return "";
    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
}

function gerarId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function salvar() {
    localStorage.setItem("transacoes", JSON.stringify(transacoes));
}
function popularCategorias() {
    categorias.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        selectCategoria.appendChild(opt);
    });

    categorias.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        filtroCategoria.appendChild(opt);
    });
}
function transacoesFiltradas() {
    return transacoes.filter(t => {
        if (filtroTipo.value !== "todos" && t.tipo !== filtroTipo.value) return false;
        if (filtroCategoria.value !== "todas" && t.categoria !== filtroCategoria.value) return false;
        if (filtroMes.value && !t.data.startsWith(filtroMes.value)) return false;
        return true;
    });
}
function atualizar() {
    const filtradas = transacoesFiltradas();

    historico.innerHTML = "";
    listaVazia.classList.toggle("oculto", filtradas.length > 0);

    filtradas
        .slice()
        .sort((a, b) => (b.data || "").localeCompare(a.data || ""))
        .forEach(t => {
            const div = document.createElement("div");
            div.classList.add("item", t.tipo);
            div.innerHTML = `
                <div class="item-info">
                    <span class="item-descricao">${t.descricao}</span>
                    <span class="item-meta">
                        <span class="categoria-badge">${t.categoria}</span>
                        <span>${formatarDataExibicao(t.data)}</span>
                    </span>
                </div>
                <span class="item-valor ${t.tipo === "receita" ? "receita-cor" : "despesa-cor"}">
                    ${t.tipo === "receita" ? "+" : "-"} ${formatarMoeda(t.valor)}
                </span>
                <div class="item-acoes">
                    <button class="btn-editar" title="Editar" onclick="iniciarEdicao('${t.id}')">✎</button>
                    <button class="btn-excluir" title="Excluir" onclick="remover('${t.id}')">✕</button>
                </div>
            `;
            historico.appendChild(div);
        });
    let receitas = 0;
    let despesas = 0;
    transacoes.forEach(t => {
        if (t.tipo === "receita") receitas += t.valor;
        else despesas += t.valor;
    });

    document.getElementById("saldo").innerText = formatarMoeda(receitas - despesas);
    document.getElementById("receitas").innerText = formatarMoeda(receitas);
    document.getElementById("despesas").innerText = formatarMoeda(despesas);

    atualizarGrafico();
    salvar();
}
const coresPorCategoria = {
    "Salário": "#64748b",
    "Alimentação": "#f59e0b",
    "Transporte": "#3b82f6",
    "Moradia": "#ef4444",
    "Lazer": "#a855f7",
    "Saúde": "#ec4899",
    "Educação": "#14b8a6",
    "Outros": "#94a3b8"
};

function atualizarGrafico() {
    const despesasPorCategoria = {};

    transacoes
        .filter(t => t.tipo === "despesa")
        .forEach(t => {
            despesasPorCategoria[t.categoria] = (despesasPorCategoria[t.categoria] || 0) + t.valor;
        });

    const labels = Object.keys(despesasPorCategoria);
    const valores = Object.values(despesasPorCategoria);
    const cores = labels.map(cat => coresPorCategoria[cat] || "#22c55e");

    const canvas = document.getElementById("graficoCategorias");
    const vazio = document.getElementById("graficoVazio");

    if (labels.length === 0) {
        canvas.classList.add("oculto");
        vazio.classList.remove("oculto");
        if (grafico) {
            grafico.destroy();
            grafico = null;
        }
        return;
    }

    canvas.classList.remove("oculto");
    vazio.classList.add("oculto");

    if (grafico) {
        grafico.data.labels = labels;
        grafico.data.datasets[0].data = valores;
        grafico.data.datasets[0].backgroundColor = cores;
        grafico.update();
        return;
    }

    grafico = new Chart(canvas, {
        type: "pie",
        data: {
            labels,
            datasets: [{
                data: valores,
                backgroundColor: cores
            }]
        },
        options: {
            plugins: {
                legend: {
                    labels: { color: "white", font: { size: 12 } }
                }
            }
        }
    });
}
function limparFormulario() {
    inputDescricao.value = "";
    inputValor.value = "";
    selectTipo.value = "receita";
    selectCategoria.value = categorias[0];
    inputData.value = new Date().toISOString().slice(0, 10);
}

function iniciarEdicao(id) {
    const t = transacoes.find(x => x.id === id);
    if (!t) return;

    editandoId = id;
    inputDescricao.value = t.descricao;
    inputValor.value = t.valor;
    selectTipo.value = t.tipo;
    selectCategoria.value = t.categoria;
    inputData.value = t.data;

    btnAdicionar.textContent = "Salvar alterações";
    btnCancelar.classList.remove("oculto");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelarEdicao() {
    editandoId = null;
    limparFormulario();
    btnAdicionar.textContent = "Adicionar";
    btnCancelar.classList.add("oculto");
}

function adicionarOuSalvar() {
    const descricao = inputDescricao.value.trim();
    const valor = Number(inputValor.value);
    const tipo = selectTipo.value;
    const categoria = selectCategoria.value;
    const data = inputData.value || new Date().toISOString().slice(0, 10);

    if (!descricao || !valor || valor <= 0) {
        alert("Preencha descrição e um valor maior que zero.");
        return;
    }

    if (editandoId) {
        const t = transacoes.find(x => x.id === editandoId);
        Object.assign(t, { descricao, valor, tipo, categoria, data });
        cancelarEdicao();
    } else {
        transacoes.push({ id: gerarId(), descricao, valor, tipo, categoria, data });
        limparFormulario();
    }

    atualizar();
}

function remover(id) {
    const t = transacoes.find(x => x.id === id);
    if (!t) return;

    const confirmar = confirm(`Excluir "${t.descricao}" (${formatarMoeda(t.valor)})?`);
    if (!confirmar) return;

    transacoes = transacoes.filter(x => x.id !== id);
    if (editandoId === id) cancelarEdicao();
    atualizar();
}
function exportarCSV() {
    if (transacoes.length === 0) {
        alert("Não há transações para exportar.");
        return;
    }

    const linhas = [["Descrição", "Valor", "Tipo", "Categoria", "Data"]];
    transacoes
        .slice()
        .sort((a, b) => (a.data || "").localeCompare(b.data || ""))
        .forEach(t => {
            linhas.push([t.descricao, t.valor.toFixed(2), t.tipo, t.categoria, t.data]);
        });

    const csv = linhas.map(l => l.map(campo => `"${String(campo).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "controle-financeiro.csv";
    link.click();
    URL.revokeObjectURL(url);
}

btnAdicionar.addEventListener("click", adicionarOuSalvar);
btnCancelar.addEventListener("click", cancelarEdicao);
btnExportar.addEventListener("click", exportarCSV);

filtroTipo.addEventListener("change", atualizar);
filtroCategoria.addEventListener("change", atualizar);
filtroMes.addEventListener("change", atualizar);

btnLimparFiltros.addEventListener("click", () => {
    filtroTipo.value = "todos";
    filtroCategoria.value = "todas";
    filtroMes.value = "";
    atualizar();
});

popularCategorias();
limparFormulario();
atualizar();
