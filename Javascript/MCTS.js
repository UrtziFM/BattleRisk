// MCTS.js
class Node {
    constructor(state, parent = null) {
        this.state = state; 
        this.parent = parent;
        this.children = [];
        this.visits = 0;
        this.wins = 0;
    }

    addChild(child) {
        this.children.push(child);
    }

    incrementVisits() {
        this.visits++;
    }

    addWins(wins) {
        this.wins += wins;
    }
}

class MCTS {
    constructor(iterations = 1000) {
        this.iterations = iterations;
    }

    selectPromisingNode(node) {
        let bestNode = node;
        let maxUCT = -Infinity;
        node.children.forEach(child => {
            let uctValue = (child.wins / child.visits) + Math.sqrt(2 * Math.log(node.visits) / child.visits);
            if (uctValue > maxUCT) {
                bestNode = child;
                maxUCT = uctValue;
            }
        });
        return bestNode;
    }

    expandNode(node) {
        const possibleStates = this.getPossibleStates(node.state);
        possibleStates.forEach(state => {
            const newNode = new Node(state, node);
            node.addChild(newNode);
        });
    }

    simulateRandomPlay(node) {
        let currentNode = node;
        while (!this.isTerminal(currentNode.state)) {
            const possibleStates = this.getPossibleStates(currentNode.state);
            if (possibleStates.length === 0) break; // Si no hay más estados posibles, detener
            currentNode.state = possibleStates[Math.floor(Math.random() * possibleStates.length)];
        }
        return this.calculateScore(currentNode.state);
    }

    backPropagation(node, score) {
        while (node !== null) {
            node.incrementVisits();
            node.addWins(score);
            node = node.parent;
        }
    }

    getBestMove(rootNode) {
        // Verifica si hay hijos antes de usar reduce
        if (rootNode.children.length === 0) {
            console.warn("No se encontraron movimientos posibles."); // Mensaje de advertencia para depuración
            return rootNode.state; // Retorna el estado raíz si no hay movimientos posibles
        }
    
        // Si hay hijos, aplica reduce para encontrar el mejor movimiento
        let bestNode = rootNode.children.reduce((prev, curr) => (prev.visits > curr.visits ? prev : curr));
        return bestNode.state;
    }
    

    runMCTS(rootState) {
        const rootNode = new Node(rootState);
        for (let i = 0; i < this.iterations; i++) {
            const promisingNode = this.selectPromisingNode(rootNode);
            if (!this.isTerminal(promisingNode.state)) {
                this.expandNode(promisingNode);
            }
            const nodeToExplore = promisingNode.children.length > 0 
                ? promisingNode.children[Math.floor(Math.random() * promisingNode.children.length)] 
                : promisingNode;
            const score = this.simulateRandomPlay(nodeToExplore);
            this.backPropagation(nodeToExplore, score);
        }
        return this.getBestMove(rootNode);
    }

    getPossibleStates(state) {
        const possibleStates = [];

        if (!state || !state.countries || !state.currentPlayer) return possibleStates;

        state.countries.forEach(country => {
            if (country.owner === state.currentPlayer.name) {
                country.neighbours.forEach(neighbourName => {
                    const neighbour = state.countries.find(c => c.name === neighbourName);
                    if (neighbour && neighbour.owner !== state.currentPlayer.name) {
                        const newState = this.simulateMove(state, country, neighbour);
                        possibleStates.push(newState);
                    }
                });
            }
        });

        return possibleStates;
    }

    simulateMove(state, fromCountry, toCountry) {
        const newState = JSON.parse(JSON.stringify(state)); // Clonar el estado actual

        const newFromCountry = newState.countries.find(c => c.name === fromCountry.name);
        const newToCountry = newState.countries.find(c => c.name === toCountry.name);

        const successProbability = newFromCountry.army / (newFromCountry.army + newToCountry.army);
        if (Math.random() < successProbability) {
            newToCountry.owner = state.currentPlayer.name;
            newToCountry.army = Math.floor(newFromCountry.army / 2);
            newFromCountry.army = Math.ceil(newFromCountry.army / 2);

            const player = newState.players.find(p => p.name === state.currentPlayer.name);
            if (player) {
                player.areas.push(newToCountry.name);
            }
        } else {
            newFromCountry.army -= Math.ceil(newToCountry.army / 2);
        }

        return newState;
    }

    calculateScore(state) {
        if (!state || !state.players) return 0;
        const currentPlayer = state.players.find(p => p.name === state.currentPlayer.name);
        if (!currentPlayer) return 0;

        let score = 0;
        score += currentPlayer.areas.length * 10; // Más áreas controladas, mejor
        const controlledContinents = this.getControlledContinents(currentPlayer, state);
        score += controlledContinents.length * 50; // Controlar un continente otorga puntos extra

        currentPlayer.areas.forEach(areaName => {
            const countryData = countriesData[areaName];
            if (countryData) {
                score += countryData.potentialCustomers * 0.1;
                score += countryData.digitalPayments * 0.5;
                score -= countryData.competitionLevel * 2;
                score -= countryData.investmentLevel * 1;
            }
        });

        return score;
    }

    getControlledContinents(player, state) {
        const controlledContinents = [];
        continents.forEach(continent => {
            const isControlled = continent.areas.every(area => player.areas.includes(area));
            if (isControlled) {
                controlledContinents.push(continent);
            }
        });
        return controlledContinents;
    }

    isTerminal(state) {
        if (!state || !state.players) return false;
        const remainingPlayers = state.players.filter(player => player.areas.length > 0);
        if (remainingPlayers.length === 1) {
            return true;
        }

        const currentPlayer = state.players.find(p => p.name === state.currentPlayer.name);
        if (!currentPlayer) return false;

        const totalIncome = this.calculateIncome(currentPlayer, state);
        if (totalIncome >= currentPlayer.targetIncome) {
            return true;
        }

        return false;
    }

    calculateIncome(player, state) {
        if (!player || !player.areas) return 0;
        let income = 0;
        player.areas.forEach(areaName => {
            const countryData = countriesData[areaName];
            if (countryData) {
                income += countryData.potentialCustomers * (countryData.digitalPayments / 100);
            }
        });
        return income;
    }
}

// Function to generate the top moves
function generateTopMoves(currentState) {
    const mcts = new MCTS(1000); // Number of iterations
    const bestState = mcts.runMCTS(currentState);
    return bestState; // Return the best state found
}

// Integrate with your game logic
function getTopMovesForPlayer(player) {
    const currentState = {
        countries: Gamestate.countries,
        players: Gamestate.players,
        currentPlayer: player
    };

    const bestState = generateTopMoves(currentState);

    // Obtén los movimientos recomendados comparando el estado actual con el mejor estado encontrado
    let recommendedMoves = getRecommendedMoves(Gamestate, bestState);
    
    // Filtrar solo los 5 mejores movimientos
    recommendedMoves = recommendedMoves.slice(0, 5); 

    // Renderiza los movimientos recomendados en el HTML
    const topMovesDiv = document.getElementById("top-moves");
    topMovesDiv.innerHTML = ''; // Limpia las recomendaciones anteriores

    // Formatea los movimientos para mostrarlos como texto legible
    recommendedMoves.forEach((move, index) => {
        const moveElement = document.createElement('p');
        moveElement.innerHTML = `${index + 1}. Mueve tropas de <strong>${move.from}</strong> a <strong>${move.to}</strong> (Objetivo: ${move.target})`;
        topMovesDiv.appendChild(moveElement);
    });
}

// Función para obtener las recomendaciones de movimientos basadas en la diferencia entre el estado actual y el mejor estado encontrado
function getRecommendedMoves(currentState, bestState) {
    const moves = [];

    bestState.countries.forEach((country, index) => {
        const originalCountry = currentState.countries.find(c => c.name === country.name);

        if (originalCountry && originalCountry.owner !== country.owner) {
            // Añade el movimiento de invasión
            moves.push({
                from: originalCountry.name,
                to: country.name,
                target: country.owner
            });
        }
    });

    // Ordenar los movimientos según alguna lógica de preferencia, por ejemplo, el tamaño del ejército o la importancia estratégica
    moves.sort((a, b) => {
        // Supongamos que tienes una función para calcular la importancia de cada movimiento
        return calculateMoveScore(b) - calculateMoveScore(a); // Ordena de mayor a menor
    });

    return moves;
}

// Supongamos que tienes una función para calcular la puntuación de cada movimiento
function calculateMoveScore(move) {
    // Lógica para calcular la importancia de un movimiento basado en su potencial estratégico
    // Puedes usar factores como la cantidad de tropas, la importancia del país, etc.
    return Math.random(); // Solo como ejemplo, reemplaza con tu lógica
}

// Espera a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', (event) => {
    const recommendButton = document.getElementById('recommend-btn');
    
    recommendButton.addEventListener('click', () => {
        getTopMovesForPlayer(Gamestate.player); // Llama a la función para obtener recomendaciones cuando se hace clic
    });
});
