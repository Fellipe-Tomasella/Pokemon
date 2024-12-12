const input = document.querySelector("#busca");
const info = document.querySelector("#info");
const mensagemErro = document.querySelector("#mensagem-erro");
const btnReiniciar = document.querySelector("#btnReiniciar");
const btnHistorico = document.querySelector("#btnHistorico");
const listaHistorico = document.querySelector("#listaHistorico");
const btnLimparHistorico = document.querySelector("#btnLimparHistorico");
const btnBuscar = document.querySelector("#btnBuscar");
const selectTipo = document.querySelector("#selectTipo");
const resultadoTipo = document.querySelector("#resultadoTipo");
let historicoPokemons = [];

const MENSAGENS = {
    ERRO_BUSCA: "Não foi possível identificar o pokemon, favor verificar a escrita",
    ERRO_HABILIDADE: "Não foi possível identificar a habilidade, favor verificar a escrita",
    ERRO_TIPO: "Tipo de Pokémon não encontrado. Verifique a escrita.",
    ERRO_GERAL: "Erro ao realizar a busca. Por favor, tente novamente."
};

class HistoricoPokemon {
    constructor() {
        this.historico = [];
        this.maxItens = 20; // Limite de itens no histórico
    }

    adicionar(pokemon) {
        if (!this.historico.some(p => p.nome === pokemon.nome)) {
            this.historico.unshift(pokemon);
            if (this.historico.length > this.maxItens) {
                this.historico.pop();
            }
            this.salvar();
            this.atualizar();
        }
    }

    salvar() {
        localStorage.setItem('historicoPokemons', JSON.stringify(this.historico));
    }

    carregar() {
        const dados = localStorage.getItem('historicoPokemons');
        if (dados) {
            this.historico = JSON.parse(dados);
            this.atualizar();
        }
    }

    limpar() {
        this.historico = [];
        localStorage.removeItem('historicoPokemons');
        this.atualizar();
    }

    atualizar() {
        // Atualizar a interface
        listaHistorico.innerHTML = this.historico
            .map(pokemon => `
                <li onclick="mostrarPokemon(${JSON.stringify(pokemon)})">${pokemon.nome}</li>
            `)
            .join('');
    }
}

const traducoes = {
    // Tipos
    fire: "Fogo",
    water: "Água",
    grass: "Planta",
    electric: "Elétrico",
    psychic: "Psíquico",
    ice: "Gelo",
    dragon: "Dragão",
    dark: "Sombrio",
    fairy: "Fada",
    normal: "Normal",
    fighting: "Lutador",
    flying: "Voador",
    poison: "Venenoso",
    ground: "Terra",
    rock: "Pedra",
    bug: "Inseto",
    ghost: "Fantasma",
    steel: "Aço",

};

function traduzir(texto) {
    return traducoes[texto.toLowerCase()] || texto;
}

function mostrarErro(mensagem) {
    info.style.display = 'none';
    mensagemErro.innerHTML = mensagem;
    mensagemErro.style.display = 'block';
}

async function buscarPokemon(busca, modoBusca) {
    try {
        let resultado;
        
        if (modoBusca === 'nome') {
            resultado = await fetch("https://pokeapi.co/api/v2/pokemon/" + busca.toLowerCase());
            if (!resultado.ok) {
                mostrarErro(MENSAGENS.ERRO_BUSCA);
                return null;
            }
        } else {
            resultado = await buscarPorHabilidade(busca);
            if (!resultado) {
                mostrarErro(MENSAGENS.ERRO_HABILIDADE);
                return null;
            }
        }

        const dados = await resultado.json();
        return await montarDadosPokemon(dados);
    } catch (erro) {
        mostrarErro(MENSAGENS.ERRO_GERAL);
        return null;
    }
}

async function realizarBusca() {
    const busca = input.value.trim();
    if (!busca) return;

    const modoBusca = document.querySelector('input[name="modo"]:checked').value;
    const pokemon = await buscarPokemon(busca, modoBusca);
    
    if (pokemon) {
        mostrarPokemon(pokemon);
        mensagemErro.style.display = 'none';
    }
}

input.addEventListener("keypress", async (event) => {
    if (event.key === "Enter") {
        realizarBusca();
    }
});

btnBuscar.addEventListener("click", realizarBusca);

function mostrarPokemon(pokemon) {
    let evolutionHtml = '';
    if (pokemon.evolucoes && pokemon.evolucoes.length > 0) {
        evolutionHtml = `
            <div class="evolucoes">
                <h2>Linha Evolutiva</h2>
                <div class="evolucoes-container">
                    ${pokemon.evolucoes.map((evo, index) => `
                        <div class="evolucao-item" onclick="buscarEClicarPokemon('${evo.nome}')">
                            <img src="${evo.imagem}" alt="${evo.nome}">
                            <p class="nome-evolucao">${evo.nome}</p>
                            ${index < pokemon.evolucoes.length - 1 ? '<span class="seta">→</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    info.innerHTML = `
        <h1>Nº ${pokemon.id.toString().padStart(3, '0')} - ${pokemon.nome}</h1>
        <img src="${pokemon.imagem}" alt="${pokemon.nome}" class="pokemon-principal">
        <p>Altura: ${pokemon.altura} metros</p>
        <p>Peso: ${pokemon.peso} kg</p>
        <p>Tipos: ${pokemon.tipos.map(tipo => traduzir(tipo)).join(", ")}</p>
        <p>Fraquezas: ${pokemon.fraquezas.map(fraqueza => traduzir(fraqueza)).join(", ")}</p>
        <p>Habilidades: ${pokemon.habilidades.map(habilidade => traduzir(habilidade)).join(", ")}</p>
        ${evolutionHtml}
    `;
    info.style.display = 'block';
    adicionarAoHistorico(pokemon);
}

async function buscarFraquezas(typeUrl) {
    const response = await fetch(typeUrl);
    const data = await response.json();
    return data.damage_relations.double_damage_from.map(type => type.name);
}

async function buscarPorHabilidade(habilidade) {
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/ability/${habilidade.toLowerCase()}`);
        if (!response.ok) return null;
        
        const data = await response.json();
        if (!data.pokemon || data.pokemon.length === 0) return null;
        
        const primeiroPokemon = data.pokemon[0].pokemon;
        const pokemonResponse = await fetch(primeiroPokemon.url);
        return pokemonResponse.ok ? pokemonResponse : null;
    } catch (erro) {
        return null;
    }
}

async function montarDadosPokemon(dados) {
    const especieUrl = dados.species.url;
    const evolucoes = await buscarEvolucoes(especieUrl);
    
    return {
        id: dados.id,
        nome: dados.name,
        imagem: dados.sprites.front_default,
        altura: (dados.height / 10).toFixed(1),
        peso: (dados.weight / 10).toFixed(1),
        tipos: dados.types.map(type => type.type.name),
        fraquezas: await buscarFraquezas(dados.types[0].type.url),
        habilidades: dados.abilities.map(ability => ability.ability.name),
        evolucoes: evolucoes
    };
}

async function buscarEvolucoes(especieUrl) {
    try {
        // Busca informações da espécie
        const especieResponse = await fetch(especieUrl);
        const especieData = await especieResponse.json();

        // Busca a cadeia evolutiva
        const evolutionResponse = await fetch(especieData.evolution_chain.url);
        const evolutionData = await evolutionResponse.json();

        return await processarCadeiaEvolutiva(evolutionData.chain);
    } catch (erro) {
        console.error("Erro ao buscar evoluções:", erro);
        return [];
    }
}

async function processarCadeiaEvolutiva(chain) {
    const evolucoes = [];
    
    // Função recursiva para processar cada elo da cadeia
    async function processarElo(elo) {
        if (!elo) return;

        try {
            // Busca dados do Pokémon atual
            const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${elo.species.name}`);
            const pokemonData = await pokemonResponse.json();

            evolucoes.push({
                nome: elo.species.name,
                imagem: pokemonData.sprites.front_default,
                nivel: elo.evolution_details[0]?.min_level || null
            });

            // Processa próxima evolução se existir
            if (elo.evolves_to?.length > 0) {
                for (const evolucao of elo.evolves_to) {
                    await processarElo(evolucao);
                }
            }
        } catch (erro) {
            console.error("Erro ao processar evolução:", erro);
        }
    }

    await processarElo(chain);
    return evolucoes;
}

function adicionarAoHistorico(pokemon) {
    if (!historicoPokemons.some(p => p.nome === pokemon.nome)) {
        historicoPokemons.unshift(pokemon);
        atualizarListaHistorico();
        salvarHistorico();
    }
}

function atualizarListaHistorico() {
    listaHistorico.innerHTML = '';
    historicoPokemons.forEach(pokemon => {
        const li = document.createElement('li');
        li.textContent = pokemon.nome;
        li.addEventListener('click', () => mostrarPokemon(pokemon));
        listaHistorico.appendChild(li);
    });
}

function salvarHistorico() {
    localStorage.setItem('historicoPokemons', JSON.stringify(historicoPokemons));
}

function carregarHistorico() {
    const historico = localStorage.getItem('historicoPokemons');
    if (historico) {
        historicoPokemons = JSON.parse(historico);
        atualizarListaHistorico();
    }
}

btnReiniciar.addEventListener("click", () => {
    input.value = '';
    info.style.display = 'none';
    mensagemErro.style.display = 'none';
    input.focus();
    document.querySelector('input[name="modo"][value="nome"]').checked = true;
    listaHistorico.classList.remove('mostrar');
});

btnHistorico.addEventListener('click', () => {
    listaHistorico.classList.toggle('mostrar');
    btnHistorico.textContent = listaHistorico.classList.contains('mostrar') 
        ? 'Histórico de Pesquisas ▲' 
        : 'Histórico de Pesquisas ▼';
});

document.addEventListener('DOMContentLoaded', carregarHistorico);

async function buscarEClicarPokemon(nome) {
    try {
        const resultado = await fetch("https://pokeapi.co/api/v2/pokemon/" + nome.toLowerCase());
        if (!resultado.ok) {
            mostrarErro("Não foi possível carregar o pokémon");
            return;
        }
        const dados = await resultado.json();
        const pokemon = await montarDadosPokemon(dados);
        mostrarPokemon(pokemon);
        mensagemErro.style.display = 'none';
    } catch (erro) {
        mostrarErro("Erro ao carregar o pokémon");
    }
}

function limparHistorico() {
    historicoPokemons = [];
    localStorage.removeItem('historicoPokemons');
    atualizarListaHistorico();
    listaHistorico.classList.remove('mostrar');
    btnHistorico.textContent = 'Histórico de Pesquisas ▼';
}

btnLimparHistorico.addEventListener("click", () => {
    if (confirm("Tem certeza que deseja limpar todo o histórico de pesquisa?")) {
        limparHistorico();
    }
});

async function buscarPokemonsPorTipo(tipo) {
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/type/${tipo.toLowerCase()}`);
        if (!response.ok) {
            throw new Error('Tipo não encontrado');
        }
        const data = await response.json();
        
        // Pegar os primeiros 10 Pokémon
        const top10Pokemons = await Promise.all(
            data.pokemon
                .slice(0, 10)
                .map(async (p) => {
                    const pokemonResponse = await fetch(p.pokemon.url);
                    return pokemonResponse.json();
                })
        );

        return top10Pokemons;
    } catch (error) {
        mostrarErro(MENSAGENS.ERRO_TIPO);
        return null;
    }
}

function mostrarPokemonsTipo(pokemons) {
    if (!pokemons) return;

    resultadoTipo.innerHTML = pokemons.map(pokemon => `
        <div class="pokemon-tipo-card" onclick="buscarEClicarPokemon('${pokemon.name}')">
            <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}">
            <h3>${pokemon.name}</h3>
            <p>Nº ${pokemon.id.toString().padStart(3, '0')}</p>
        </div>
    `).join('');

    resultadoTipo.style.display = 'grid';
}

selectTipo.addEventListener("change", async () => {
    const tipo = selectTipo.value;
    if (!tipo) {
        resultadoTipo.style.display = 'none';
        return;
    }

    const pokemons = await buscarPokemonsPorTipo(tipo);
    if (pokemons) {
        mostrarPokemonsTipo(pokemons);
    }
});

function mostrarLoading(mostrar = true) {
    const loading = document.createElement('div');
    loading.id = 'loading';
    loading.innerHTML = 'Carregando...';
    
    if (mostrar) {
        document.body.appendChild(loading);
    } else {
        document.getElementById('loading')?.remove();
    }
}
