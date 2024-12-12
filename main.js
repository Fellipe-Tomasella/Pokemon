const input = document.querySelector("#busca");
const info = document.querySelector("#info");
const mensagemErro = document.querySelector("#mensagem-erro");
const btnReiniciar = document.querySelector("#btnReiniciar");
const btnHistorico = document.querySelector("#btnHistorico");
const listaHistorico = document.querySelector("#listaHistorico");
const btnLimparHistorico = document.querySelector("#btnLimparHistorico");
let historicoPokemons = [];

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
                mostrarErro("Não foi possível identificar o pokemon, favor verificar a escrita");
                return null;
            }
        } else {
            resultado = await buscarPorHabilidade(busca);
            if (!resultado) {
                mostrarErro("Não foi possível identificar a habilidade, favor verificar a escrita");
                return null;
            }
        }

        const dados = await resultado.json();
        return await montarDadosPokemon(dados);
    } catch (erro) {
        mostrarErro("Erro ao realizar a busca. Por favor, tente novamente.");
        return null;
    }
}

input.addEventListener("keypress", async (event) => {
    if (event.key === "Enter") {
        const busca = event.target.value.trim();
        if (!busca) return;

        const modoBusca = document.querySelector('input[name="modo"]:checked').value;
        const pokemon = await buscarPokemon(busca, modoBusca);
        
        if (pokemon) {
            mostrarPokemon(pokemon);
            mensagemErro.style.display = 'none';
        }
    }
});

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
        <h1>${pokemon.nome}</h1>
        <img src="${pokemon.imagem}" alt="${pokemon.nome}" class="pokemon-principal">
        <p>Altura: ${pokemon.altura} metros</p>
        <p>Peso: ${pokemon.peso} kg</p>
        <p>Tipos: ${pokemon.tipos.join(", ")}</p>
        <p>Fraquezas: ${pokemon.fraquezas.join(", ")}</p>
        <p>Habilidades: ${pokemon.habilidades.join(", ")}</p>
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
